-- Admin can permanently delete a user account (auth + profile cascade)

CREATE TABLE IF NOT EXISTS public.admin_deleted_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_user_id uuid NOT NULL,
  deleted_email text NOT NULL,
  deleted_name text,
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_deleted_users_created_at_idx
  ON public.admin_deleted_users (created_at DESC);

ALTER TABLE public.admin_deleted_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read deleted users log" ON public.admin_deleted_users;
CREATE POLICY "Admins can read deleted users log" ON public.admin_deleted_users
  FOR SELECT USING (public.is_admin());

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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Could not delete user account';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'email', v_profile.email
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid, text) TO authenticated;
