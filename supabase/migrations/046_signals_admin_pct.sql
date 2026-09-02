-- User signal percentage (admin-controlled) + admin grant / bulk adjust

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signal_pct numeric(6, 2) NOT NULL DEFAULT 0
  CHECK (signal_pct >= 0 AND signal_pct <= 100);

ALTER TABLE public.signal_packages
  ADD COLUMN IF NOT EXISTS admin_granted boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.user_signal_pct_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  previous_pct numeric(6, 2) NOT NULL,
  new_pct numeric(6, 2) NOT NULL,
  delta_pct numeric(6, 2),
  note text,
  bulk boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_signal_pct_adjustments_user_idx
  ON public.user_signal_pct_adjustments (user_id, created_at DESC);

ALTER TABLE public.user_signal_pct_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage signal pct adjustments" ON public.user_signal_pct_adjustments;
CREATE POLICY "Admins manage signal pct adjustments" ON public.user_signal_pct_adjustments
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users view own signal pct adjustments" ON public.user_signal_pct_adjustments;
CREATE POLICY "Users view own signal pct adjustments" ON public.user_signal_pct_adjustments
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE OR REPLACE FUNCTION public.clamp_signal_pct(p_pct numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(0, LEAST(100, round(COALESCE(p_pct, 0), 2)));
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_signal_pct(
  p_user_id uuid,
  p_pct numeric,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_before numeric(6, 2);
  v_after numeric(6, 2);
  v_note text := nullif(trim(COALESCE(p_note, '')), '');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User is required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  v_after := public.clamp_signal_pct(p_pct);

  SELECT signal_pct INTO v_before FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  v_before := COALESCE(v_before, 0);

  UPDATE public.profiles
  SET signal_pct = v_after, updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.user_signal_pct_adjustments (
    user_id, admin_id, previous_pct, new_pct, delta_pct, note, bulk
  )
  VALUES (
    p_user_id, v_admin_id, v_before, v_after, v_after - v_before, v_note, false
  );

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    p_user_id,
    'Signal allocation updated',
    'Your signal allocation is now ' || v_after::text || '%.'
  );

  RETURN jsonb_build_object('ok', true, 'signal_pct', v_after, 'previous_pct', v_before);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_bulk_adjust_signal_pct(
  p_delta numeric,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_note text := nullif(trim(COALESCE(p_note, '')), '');
  v_delta numeric(6, 2);
  v_count integer := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'Delta must be non-zero';
  END IF;

  v_delta := round(p_delta, 2);

  WITH updated AS (
    UPDATE public.profiles p
    SET signal_pct = public.clamp_signal_pct(p.signal_pct + v_delta),
        updated_at = now()
    WHERE p.role <> 'admin'
    RETURNING p.id, p.signal_pct AS new_pct
  )
  SELECT COUNT(*)::int INTO v_count FROM updated;

  INSERT INTO public.user_signal_pct_adjustments (
    user_id, admin_id, previous_pct, new_pct, delta_pct, note, bulk
  )
  SELECT
    NULL,
    v_admin_id,
    0,
    0,
    v_delta,
    COALESCE(v_note, 'Bulk signal adjustment'),
    true;

  RETURN jsonb_build_object('ok', true, 'users_updated', v_count, 'delta', v_delta);
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

REVOKE ALL ON FUNCTION public.admin_set_user_signal_pct(uuid, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_bulk_adjust_signal_pct(numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_grant_user_signal(uuid, text, text, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_set_user_signal_pct(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bulk_adjust_signal_pct(numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_user_signal(uuid, text, text, integer) TO authenticated;
