-- Disable promoting/demoting admins from the application.
-- Role changes must be done manually in the database by an operator.

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_setting('app.allow_role_change', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'Role changes are disabled on the website. Update role in the database only.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- Operator-only helper (not granted to authenticated clients).
CREATE OR REPLACE FUNCTION public.operator_set_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  PERFORM set_config('app.allow_role_change', 'on', true);
  UPDATE public.profiles
  SET role = p_role, updated_at = now()
  WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.operator_set_user_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.operator_set_user_role(uuid, text) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_moderate_user(
  p_user_id uuid,
  p_action text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_reason text := trim(COALESCE(p_reason, ''));
  v_profile public.profiles%ROWTYPE;
  v_action text := lower(trim(COALESCE(p_action, '')));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_admin_id = p_user_id THEN
    RAISE EXCEPTION 'You cannot moderate your own account';
  END IF;

  IF v_action IN ('make_admin', 'demote') THEN
    RAISE EXCEPTION 'Promoting or demoting admins is disabled on the website';
  END IF;

  IF v_action NOT IN ('suspend', 'unsuspend', 'reset_kyc', 'note') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  IF v_action = 'unsuspend' AND char_length(v_reason) < 3 THEN
    v_reason := 'Suspension lifted by administrator';
  ELSIF char_length(v_reason) < 3 THEN
    RAISE EXCEPTION 'A reason of at least 3 characters is required';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_action = 'suspend' THEN
    IF v_profile.role = 'admin' THEN
      RAISE EXCEPTION 'Cannot suspend an admin account from the website';
    END IF;
    UPDATE public.profiles
    SET
      is_suspended = true,
      suspended_at = now(),
      suspended_by = v_admin_id,
      suspension_reason = v_reason,
      updated_at = now()
    WHERE id = p_user_id;

    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      p_user_id,
      'Account suspended',
      'Your account has been suspended. Reason: ' || v_reason
    );

  ELSIF v_action = 'unsuspend' THEN
    IF NOT COALESCE(v_profile.is_suspended, false) THEN
      RETURN jsonb_build_object(
        'ok', true,
        'action', v_action,
        'user_id', p_user_id,
        'already_active', true
      );
    END IF;

    UPDATE public.profiles
    SET
      is_suspended = false,
      suspended_at = NULL,
      suspended_by = NULL,
      suspension_reason = NULL,
      updated_at = now()
    WHERE id = p_user_id;

    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      p_user_id,
      'Account reinstated',
      'Your account suspension has been lifted. Reason: ' || v_reason
    );

  ELSIF v_action = 'reset_kyc' THEN
    UPDATE public.profiles
    SET kyc_status = 'none', updated_at = now()
    WHERE id = p_user_id;

    UPDATE public.kyc_submissions
    SET status = 'rejected', notes = COALESCE(notes || E'\n', '') || 'Admin reset: ' || v_reason, updated_at = now()
    WHERE user_id = p_user_id AND status IN ('pending', 'approved');

  ELSIF v_action = 'note' THEN
    UPDATE public.profiles
    SET admin_notes = v_reason, updated_at = now()
    WHERE id = p_user_id;
  END IF;

  INSERT INTO public.admin_user_actions (user_id, admin_id, action_type, reason)
  VALUES (p_user_id, v_admin_id, v_action, v_reason);

  RETURN jsonb_build_object(
    'ok', true,
    'action', v_action,
    'user_id', p_user_id
  );
END;
$$;
