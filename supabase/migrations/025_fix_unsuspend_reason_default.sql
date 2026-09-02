-- Allow lift-suspension without a typed reason; keep reason required for other actions
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

  IF v_action NOT IN ('suspend', 'unsuspend', 'reset_kyc', 'make_admin', 'demote', 'note') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  -- Unsuspend should always be easy to complete; other actions need a real reason.
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
      RAISE EXCEPTION 'Suspend an admin only after demoting them first';
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

  ELSIF v_action = 'make_admin' THEN
    IF v_profile.is_suspended THEN
      RAISE EXCEPTION 'Unsuspend the user before making them an admin';
    END IF;
    UPDATE public.profiles
    SET role = 'admin', updated_at = now()
    WHERE id = p_user_id;

  ELSIF v_action = 'demote' THEN
    IF (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last admin';
    END IF;
    UPDATE public.profiles
    SET role = 'user', updated_at = now()
    WHERE id = p_user_id;

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

REVOKE ALL ON FUNCTION public.admin_moderate_user(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_moderate_user(uuid, text, text) TO authenticated;
