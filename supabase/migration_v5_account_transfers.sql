ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS to_account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS to_amount NUMERIC(15, 2);

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('income', 'expense', 'transfer'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_transfer_fields_check'
      AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_transfer_fields_check CHECK (
        (type = 'transfer' AND to_account_id IS NOT NULL AND to_amount IS NOT NULL AND to_amount > 0 AND to_account_id <> account_id)
        OR (type IN ('income', 'expense') AND to_account_id IS NULL AND to_amount IS NULL)
      );
  END IF;
END;
$$;

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