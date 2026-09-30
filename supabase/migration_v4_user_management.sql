ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('super_user', 'admin', 'user'));
  END IF;
END;
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_currency TEXT NOT NULL DEFAULT 'USD';

REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
GRANT INSERT (id, email, full_name, preferred_currency, updated_at)
  ON public.profiles TO authenticated;
GRANT UPDATE (id, email, full_name, avatar_url, preferred_currency, updated_at)
  ON public.profiles TO authenticated;