-- Subscribing to any trading signal plan sets the user's signal allocation to 100%.

CREATE OR REPLACE FUNCTION public.apply_signal_subscription_pct()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before numeric(6, 2);
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  IF NEW.expires_at IS NOT NULL AND NEW.expires_at <= now() THEN
    RETURN NEW;
  END IF;

  SELECT signal_pct INTO v_before
  FROM public.profiles
  WHERE id = NEW.user_id
  FOR UPDATE;

  IF v_before IS NULL THEN
    RETURN NEW;
  END IF;

  IF COALESCE(v_before, 0) >= 100 THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
  SET signal_pct = 100, updated_at = now()
  WHERE id = NEW.user_id;

  IF COALESCE(NEW.admin_granted, false) IS NOT TRUE THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      NEW.user_id,
      'Signal allocation updated',
      'Your signal allocation is now 100% after activating a trading signals plan.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_signal_subscribe_pct ON public.signal_packages;
CREATE TRIGGER trg_signal_subscribe_pct
  AFTER INSERT OR UPDATE OF status, expires_at ON public.signal_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_signal_subscription_pct();

-- Admin grants use price 0; do not treat that as an invalid purchase.
CREATE OR REPLACE FUNCTION public.debit_balance_for_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  debit_amount numeric;
  current_amount numeric;
BEGIN
  IF TG_TABLE_NAME = 'mining_packages' THEN
    debit_amount := NEW.investment;
  ELSIF TG_TABLE_NAME = 'signal_packages' THEN
    debit_amount := NEW.price;
  ELSE
    RETURN NEW;
  END IF;

  IF debit_amount IS NULL OR debit_amount <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT amount INTO current_amount
  FROM public.balances
  WHERE user_id = NEW.user_id
  FOR UPDATE;

  IF current_amount IS NULL OR current_amount < debit_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.balances
  SET amount = amount - debit_amount,
      updated_at = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_user_signal(
  p_user_id uuid,
  p_package_id text,
  p_package_name text,
  p_duration_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_row public.signal_packages%ROWTYPE;
  v_days integer := GREATEST(1, COALESCE(p_duration_days, 30));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_user_id IS NULL OR nullif(trim(p_package_id), '') IS NULL OR nullif(trim(p_package_name), '') IS NULL THEN
    RAISE EXCEPTION 'User and package are required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO public.signal_packages (
    user_id, package_name, package_id, price, status, expires_at, admin_granted
  )
  VALUES (
    p_user_id,
    trim(p_package_name),
    trim(p_package_id),
    0,
    'active',
    now() + make_interval(days => v_days),
    true
  )
  RETURNING * INTO v_row;

  UPDATE public.profiles
  SET signal_pct = 100, updated_at = now()
  WHERE id = p_user_id
    AND COALESCE(signal_pct, 0) < 100;

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    p_user_id,
    'Signal access granted',
    'Team granted you ' || trim(p_package_name) || ' signal access for ' || v_days::text || ' days. Your signal allocation is now 100%.'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'package_id', v_row.id,
    'expires_at', v_row.expires_at
  );
END;
$$;

-- Existing active subscribers also receive 100% allocation.
UPDATE public.profiles p
SET signal_pct = 100, updated_at = now()
WHERE COALESCE(p.signal_pct, 0) < 100
  AND EXISTS (
    SELECT 1
    FROM public.signal_packages sp
    WHERE sp.user_id = p.id
      AND sp.status = 'active'
      AND (sp.expires_at IS NULL OR sp.expires_at > now())
  );
