-- ONYX frontend: profile registration fields + relaxed RLS for authenticated users
-- Applied to remote Supabase project via MCP

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS address text;

-- Signup trigger stores extended profile metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_currency text := public.normalize_account_currency(NEW.raw_user_meta_data->>'preferred_currency');
  v_first_name text := NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), '');
  v_last_name text := NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), '');
  v_full_name text := COALESCE(
    NULLIF(TRIM(CONCAT(v_first_name, ' ', v_last_name)), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    ''
  );
  v_dob date;
BEGIN
  BEGIN
    v_dob := NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '')::date;
  EXCEPTION WHEN OTHERS THEN
    v_dob := NULL;
  END;

  INSERT INTO public.profiles (
    id, email, full_name, first_name, last_name, phone, country,
    date_of_birth, address, role, kyc_status, preferred_currency
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    v_full_name,
    v_first_name,
    v_last_name,
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'country'), ''),
    v_dob,
    NULLIF(TRIM(NEW.raw_user_meta_data->>'address'), ''),
    'user',
    'none',
    v_currency
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    country = COALESCE(EXCLUDED.country, profiles.country),
    date_of_birth = COALESCE(EXCLUDED.date_of_birth, profiles.date_of_birth),
    address = COALESCE(EXCLUDED.address, profiles.address),
    preferred_currency = COALESCE(profiles.preferred_currency, EXCLUDED.preferred_currency),
    updated_at = NOW();

  INSERT INTO public.balances (user_id, currency, amount)
  VALUES (NEW.id, v_currency, 0)
  ON CONFLICT (user_id) DO NOTHING;

  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      NEW.id,
      'Welcome to ONYX',
      'Your account is ready. Notifications are enabled so you will be alerted about deposits, withdrawals, trades, and AI bot activity.'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Allow authenticated active users to trade/deposit without KYC gate
DROP POLICY IF EXISTS "Users can insert own trades" ON public.trades;
CREATE POLICY "Users can insert own trades" ON public.trades
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Users can insert deposits" ON public.deposits;
CREATE POLICY "Users can insert deposits" ON public.deposits
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Users can insert withdrawals" ON public.withdrawals;
CREATE POLICY "Users can insert withdrawals" ON public.withdrawals
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Users can insert ai subs" ON public.ai_trading_subscriptions;
CREATE POLICY "Users can insert ai subs" ON public.ai_trading_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Users can insert copy subs" ON public.copy_trading_subscriptions;
CREATE POLICY "Users can insert copy subs" ON public.copy_trading_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_account_active(auth.uid()));
