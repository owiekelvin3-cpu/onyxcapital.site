-- Account currency preference on profiles; sync balance denomination on signup

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_currency TEXT NOT NULL DEFAULT 'USD';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_preferred_currency_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_preferred_currency_check
  CHECK (preferred_currency IN ('USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'JPY', 'AED', 'SGD', 'HKD'));

CREATE OR REPLACE FUNCTION public.normalize_account_currency(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE upper(trim(COALESCE(p_code, '')))
    WHEN 'EUR' THEN 'EUR'
    WHEN 'GBP' THEN 'GBP'
    WHEN 'AUD' THEN 'AUD'
    WHEN 'CAD' THEN 'CAD'
    WHEN 'CHF' THEN 'CHF'
    WHEN 'JPY' THEN 'JPY'
    WHEN 'AED' THEN 'AED'
    WHEN 'SGD' THEN 'SGD'
    WHEN 'HKD' THEN 'HKD'
    ELSE 'USD'
  END;
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_currency text := public.normalize_account_currency(NEW.raw_user_meta_data->>'preferred_currency');
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, kyc_status, preferred_currency)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user',
    'none',
    v_currency
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    preferred_currency = COALESCE(profiles.preferred_currency, EXCLUDED.preferred_currency),
    updated_at = NOW();

  INSERT INTO public.balances (user_id, currency, amount)
  VALUES (NEW.id, v_currency, 0)
  ON CONFLICT (user_id) DO NOTHING;

  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      NEW.id,
      'Welcome to VELION MARKETS',
      'Your account is ready. Notifications are enabled so you will be alerted about deposits, withdrawals, trades, and AI bot activity.'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_currency(p_currency text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_currency text := public.normalize_account_currency(p_currency);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles
  SET preferred_currency = v_currency, updated_at = now()
  WHERE id = v_uid;

  UPDATE public.balances
  SET currency = v_currency, updated_at = now()
  WHERE user_id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.update_user_currency(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_user_currency(text) TO authenticated;
