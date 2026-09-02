-- Harden admin suspend/delete RPCs and enable profile realtime for suspension UI.

ALTER TABLE public.profiles REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

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
      INSERT INTO public.admin_user_actions (user_id, admin_id, action_type, reason)
      VALUES (p_user_id, v_admin_id, v_action, v_reason);

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

CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_user_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_reason text := trim(COALESCE(p_reason, ''));
  v_profile public.profiles%ROWTYPE;
  v_deleted_auth boolean := false;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_admin_id = p_user_id THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;

  IF char_length(v_reason) < 3 THEN
    RAISE EXCEPTION 'A reason of at least 3 characters is required';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_profile.role = 'admin' AND (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'Cannot delete the last admin';
  END IF;

  INSERT INTO public.admin_deleted_users (
    deleted_user_id,
    deleted_email,
    deleted_name,
    admin_id,
    reason
  )
  VALUES (
    p_user_id,
    v_profile.email,
    v_profile.full_name,
    v_admin_id,
    v_reason
  );

  DELETE FROM auth.users WHERE id = p_user_id;
  v_deleted_auth := FOUND;

  IF NOT v_deleted_auth THEN
    DELETE FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Could not delete user account';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'email', v_profile.email,
    'deleted_auth', v_deleted_auth
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_moderate_user(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_moderate_user(uuid, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_delete_user(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid, text) TO authenticated;
