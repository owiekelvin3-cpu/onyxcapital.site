-- Stop mapping signal subscriptions onto a percentage. The dashboard shows the package name.

CREATE OR REPLACE FUNCTION public.apply_signal_subscription_pct()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  IF NEW.expires_at IS NOT NULL AND NEW.expires_at <= now() THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.admin_granted, false) IS NOT TRUE THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      NEW.user_id,
      'Signal plan activated',
      'Your ' || COALESCE(nullif(trim(NEW.package_name), ''), 'signal') || ' plan is now active.'
    );
  END IF;

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

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    p_user_id,
    'Signal access granted',
    'Team granted you ' || trim(p_package_name) || ' signal access for ' || v_days::text || ' days.'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'package_id', v_row.id,
    'expires_at', v_row.expires_at
  );
END;
$$;
