-- Referral / affiliate: unique codes per user, $100 reward when referred user completes first deposit.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_code text;
  v_taken boolean;
BEGIN
  LOOP
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.referral_code = v_code) INTO v_taken;
    EXIT WHEN NOT v_taken;
  END LOOP;
  RETURN v_code;
END;
$$;

UPDATE public.profiles
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL OR trim(referral_code) = '';

ALTER TABLE public.profiles
  ALTER COLUMN referral_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_idx ON public.profiles (referral_code);
CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles (referred_by);

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deposit_id uuid NOT NULL REFERENCES public.deposits(id) ON DELETE CASCADE,
  amount numeric(18, 2) NOT NULL DEFAULT 100 CHECK (amount > 0),
  balance_before numeric(18, 2) NOT NULL,
  balance_after numeric(18, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_rewards_referred_user_unique UNIQUE (referred_user_id)
);

CREATE INDEX IF NOT EXISTS referral_rewards_referrer_id_idx
  ON public.referral_rewards (referrer_id, created_at DESC);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own referral rewards" ON public.referral_rewards;
CREATE POLICY "Users can view own referral rewards" ON public.referral_rewards
  FOR SELECT USING (auth.uid() = referrer_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage referral rewards" ON public.referral_rewards;
CREATE POLICY "Admins can manage referral rewards" ON public.referral_rewards
  FOR ALL USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.referral_code = upper(trim(COALESCE(p_code, '')))
      AND trim(COALESCE(p_code, '')) <> ''
  );
$$;

CREATE OR REPLACE FUNCTION public.process_referral_reward_on_deposit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_reward numeric(18, 2) := 100;
  v_balance_before numeric(18, 2);
  v_balance_after numeric(18, 2);
  v_referred_label text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('completed', 'approved') THEN
    RETURN NEW;
  END IF;

  IF OLD.status IN ('completed', 'approved') THEN
    RETURN NEW;
  END IF;

  SELECT p.referred_by INTO v_referrer_id
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  IF v_referrer_id IS NULL OR v_referrer_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.referral_rewards rr WHERE rr.referred_user_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.balances (user_id, currency, amount)
  VALUES (v_referrer_id, 'USD', 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT b.amount INTO v_balance_before
  FROM public.balances b
  WHERE b.user_id = v_referrer_id
  FOR UPDATE;

  v_balance_before := COALESCE(v_balance_before, 0);
  v_balance_after := v_balance_before + v_reward;

  UPDATE public.balances
  SET amount = v_balance_after, updated_at = now()
  WHERE user_id = v_referrer_id;

  INSERT INTO public.referral_rewards (
    referrer_id,
    referred_user_id,
    deposit_id,
    amount,
    balance_before,
    balance_after
  )
  VALUES (
    v_referrer_id,
    NEW.user_id,
    NEW.id,
    v_reward,
    v_balance_before,
    v_balance_after
  );

  SELECT COALESCE(NULLIF(trim(p.full_name), ''), p.email, 'A new user')
  INTO v_referred_label
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  PERFORM create_notification(
    v_referrer_id,
    'Referral bonus earned',
    v_referred_label || ' completed their first deposit — ' ||
    format_usd_amount(v_reward) || ' has been credited to your balance.'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_reward_on_deposit ON public.deposits;
CREATE TRIGGER trg_referral_reward_on_deposit
  AFTER UPDATE OF status ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.process_referral_reward_on_deposit();

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
  v_referral_input text := upper(nullif(trim(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')), ''));
  v_referrer_id uuid;
  v_referral_code text := public.generate_referral_code();
BEGIN
  BEGIN
    v_dob := NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '')::date;
  EXCEPTION WHEN OTHERS THEN
    v_dob := NULL;
  END;

  IF v_referral_input IS NOT NULL THEN
    SELECT p.id INTO v_referrer_id
    FROM public.profiles p
    WHERE p.referral_code = v_referral_input
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, first_name, last_name, phone, country,
    date_of_birth, address, role, kyc_status, preferred_currency, signal_pct,
    referral_code, referred_by
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
    v_currency,
    50,
    v_referral_code,
    CASE WHEN v_referrer_id IS NOT NULL AND v_referrer_id <> NEW.id THEN v_referrer_id ELSE NULL END
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
    referral_code = COALESCE(profiles.referral_code, EXCLUDED.referral_code),
    referred_by = COALESCE(profiles.referred_by, EXCLUDED.referred_by),
    updated_at = NOW();

  INSERT INTO public.balances (user_id, currency, amount)
  VALUES (NEW.id, v_currency, 0)
  ON CONFLICT (user_id) DO NOTHING;

  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      NEW.id,
      'Welcome to ONYX',
      'Your account is ready with 50% signal strength. Notifications are enabled so you will be alerted about deposits, withdrawals, trades, and AI bot activity.'
    );

    IF v_referrer_id IS NOT NULL AND v_referrer_id <> NEW.id THEN
      PERFORM create_notification(
        v_referrer_id,
        'New referral joined',
        COALESCE(v_full_name, NEW.email, 'Someone') ||
        ' signed up with your referral ID. You earn $100 when they complete their first deposit.'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_referral_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(text) TO anon, authenticated;
