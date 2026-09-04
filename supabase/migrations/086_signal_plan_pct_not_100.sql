-- Overview allocation follows the package, not a blanket 100%.
-- Newbie 20 / Bronze 40 / Silver 60 / Gold 80 / Platinum 100.
-- Admin can still raise or lower a user after subscribe.

CREATE OR REPLACE FUNCTION public.signal_plan_pct(p_tier text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(COALESCE(p_tier, ''))
    WHEN 'platinum' THEN 100
    WHEN 'premier' THEN 100
    WHEN 'executive' THEN 100
    WHEN 'sovereign' THEN 100
    WHEN 'gold' THEN 80
    WHEN 'institutional' THEN 80
    WHEN 'silver' THEN 60
    WHEN 'vip' THEN 60
    WHEN 'elite' THEN 60
    WHEN 'bronze' THEN 40
    WHEN 'pro' THEN 40
    WHEN 'professional' THEN 40
    WHEN 'newbie' THEN 20
    WHEN 'starter' THEN 20
    WHEN 'basic' THEN 20
    ELSE 0
  END::numeric;
$$;

CREATE OR REPLACE FUNCTION public.apply_signal_subscription_pct()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before numeric(6, 2);
  v_plan numeric(6, 2);
  v_after numeric(6, 2);
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  IF NEW.expires_at IS NOT NULL AND NEW.expires_at <= now() THEN
    RETURN NEW;
  END IF;

  v_plan := public.clamp_signal_pct(public.signal_plan_pct(NEW.package_id));
  IF v_plan <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT signal_pct INTO v_before
  FROM public.profiles
  WHERE id = NEW.user_id
  FOR UPDATE;

  IF v_before IS NULL THEN
    RETURN NEW;
  END IF;

  -- Legacy subscribe wrote 100% for every plan. Replace that with the package %.
  IF COALESCE(v_before, 0) >= 100 AND v_plan < 100 THEN
    v_after := v_plan;
  ELSE
    v_after := GREATEST(COALESCE(v_before, 0), v_plan);
  END IF;

  IF v_after = COALESCE(v_before, 0) THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
  SET signal_pct = v_after, updated_at = now()
  WHERE id = NEW.user_id;

  IF COALESCE(NEW.admin_granted, false) IS NOT TRUE THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      NEW.user_id,
      'Signal allocation updated',
      'Your signal allocation is now ' || trim(to_char(v_after, 'FM999990')) ||
      '% after activating ' || COALESCE(nullif(trim(NEW.package_name), ''), 'a signal plan') || '.'
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

GRANT EXECUTE ON FUNCTION public.signal_plan_pct(text) TO authenticated, service_role;

-- Reset leftover 100% rows (and empty rows) to the active package allocation.
UPDATE public.profiles p
SET
  signal_pct = public.clamp_signal_pct(best.plan_pct),
  updated_at = now()
FROM (
  SELECT DISTINCT ON (sp.user_id)
    sp.user_id,
    public.signal_plan_pct(sp.package_id) AS plan_pct
  FROM public.signal_packages sp
  WHERE sp.status = 'active'
    AND (sp.expires_at IS NULL OR sp.expires_at > now())
  ORDER BY sp.user_id, public.signal_plan_pct(sp.package_id) DESC, sp.created_at DESC
) best
WHERE p.id = best.user_id
  AND best.plan_pct > 0
  AND (
    COALESCE(p.signal_pct, 0) <= 0
    OR (COALESCE(p.signal_pct, 0) >= 100 AND best.plan_pct < 100)
  );
