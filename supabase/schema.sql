-- ============================================================
-- My Money - Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- PROFILES (optional, linked to auth.users)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  job_title TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_user', 'admin', 'user')),
  avatar_url TEXT,
  preferred_currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- ACCOUNTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'credit_card', 'investment', 'other')),
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON public.accounts(user_id);

-- ------------------------------------------------------------
-- CATEGORIES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT NOT NULL DEFAULT 'tag',
  color TEXT NOT NULL DEFAULT '#64748b',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS categories_user_id_idx ON public.categories(user_id);

-- ------------------------------------------------------------
-- TRANSACTIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  to_account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  to_amount NUMERIC(15, 2),
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT transactions_transfer_fields_check CHECK (
    (type = 'transfer' AND to_account_id IS NOT NULL AND to_amount IS NOT NULL AND to_amount > 0 AND to_account_id <> account_id)
    OR (type IN ('income', 'expense') AND to_account_id IS NULL AND to_amount IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS transactions_account_id_idx ON public.transactions(account_id);

CREATE OR REPLACE FUNCTION public.save_account_transfer(
  p_transaction_id UUID,
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC,
  p_to_amount NUMERIC,
  p_description TEXT,
  p_date DATE,
  p_delete BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_transfer public.transactions%ROWTYPE;
  v_transfer_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_transaction_id IS NOT NULL THEN
    SELECT * INTO v_transfer
    FROM public.transactions
    WHERE id = p_transaction_id AND user_id = v_user_id AND type = 'transfer'
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Transfer not found';
    END IF;
    v_transfer_id := v_transfer.id;
  ELSIF p_delete THEN
    RAISE EXCEPTION 'Transfer id is required for deletion';
  END IF;

  IF NOT p_delete THEN
    IF p_from_account_id IS NULL OR p_to_account_id IS NULL
       OR p_from_account_id = p_to_account_id THEN
      RAISE EXCEPTION 'Choose two different accounts';
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 OR p_to_amount IS NULL OR p_to_amount <= 0 THEN
      RAISE EXCEPTION 'Transfer amounts must be greater than zero';
    END IF;
  END IF;

  PERFORM a.id
  FROM public.accounts AS a
  WHERE a.user_id = v_user_id
    AND a.id = ANY(ARRAY[
      v_transfer.account_id,
      v_transfer.to_account_id,
      p_from_account_id,
      p_to_account_id
    ]::UUID[])
  ORDER BY a.id
  FOR UPDATE;

  IF v_transfer_id IS NOT NULL AND (
    NOT EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = v_transfer.account_id AND user_id = v_user_id
    ) OR NOT EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = v_transfer.to_account_id AND user_id = v_user_id
    )
  ) THEN
    RAISE EXCEPTION 'Transfer accounts not found';
  END IF;

  IF NOT p_delete AND (
    NOT EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = p_from_account_id AND user_id = v_user_id AND is_archived = FALSE
    ) OR NOT EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = p_to_account_id AND user_id = v_user_id AND is_archived = FALSE
    )
  ) THEN
    RAISE EXCEPTION 'Choose active accounts that belong to your user';
  END IF;

  IF v_transfer_id IS NOT NULL THEN
    UPDATE public.accounts
    SET balance = balance + v_transfer.amount, updated_at = now()
    WHERE id = v_transfer.account_id AND user_id = v_user_id;

    UPDATE public.accounts
    SET balance = balance - v_transfer.to_amount, updated_at = now()
    WHERE id = v_transfer.to_account_id AND user_id = v_user_id;
  END IF;

  IF p_delete THEN
    DELETE FROM public.transactions
    WHERE id = v_transfer_id AND user_id = v_user_id;
    RETURN v_transfer_id;
  END IF;

  IF v_transfer_id IS NULL THEN
    INSERT INTO public.transactions (
      user_id, account_id, to_account_id, type, amount, to_amount, description, date
    ) VALUES (
      v_user_id, p_from_account_id, p_to_account_id, 'transfer', p_amount,
      p_to_amount, NULLIF(p_description, ''), p_date
    )
    RETURNING id INTO v_transfer_id;
  ELSE
    UPDATE public.transactions
    SET account_id = p_from_account_id,
        to_account_id = p_to_account_id,
        amount = p_amount,
        to_amount = p_to_amount,
        description = NULLIF(p_description, ''),
        date = p_date,
        updated_at = now()
    WHERE id = v_transfer_id AND user_id = v_user_id;
  END IF;

  UPDATE public.accounts
  SET balance = balance - p_amount, updated_at = now()
  WHERE id = p_from_account_id AND user_id = v_user_id;

  UPDATE public.accounts
  SET balance = balance + p_to_amount, updated_at = now()
  WHERE id = p_to_account_id AND user_id = v_user_id;

  RETURN v_transfer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_account_transfer(UUID, UUID, UUID, NUMERIC, NUMERIC, TEXT, DATE, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_account_transfer(UUID, UUID, UUID, NUMERIC, NUMERIC, TEXT, DATE, BOOLEAN) TO authenticated;

-- ------------------------------------------------------------
-- BUDGETS (for future use)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, category_id, month, year)
);

CREATE INDEX IF NOT EXISTS budgets_user_id_idx ON public.budgets(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — CRITICAL
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
GRANT INSERT (id, email, full_name, preferred_currency, updated_at)
  ON public.profiles TO authenticated;
GRANT UPDATE (id, email, full_name, avatar_url, preferred_currency, updated_at)
  ON public.profiles TO authenticated;

-- Accounts
CREATE POLICY "Users can manage own accounts"
  ON public.accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Categories
CREATE POLICY "Users can manage own categories"
  ON public.categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Transactions
CREATE POLICY "Users can manage own transactions"
  ON public.transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Budgets
CREATE POLICY "Users can manage own budgets"
  ON public.budgets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- DONE
-- After running this:
-- 1. Go to Authentication → Providers and enable Email
-- 2. (Optional) Disable "Confirm email" for faster testing
-- ============================================================
