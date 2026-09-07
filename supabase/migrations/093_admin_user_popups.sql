-- Admin popups: tagged notifications plus a send log.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'system';

CREATE INDEX IF NOT EXISTS notifications_user_unread_kind_idx
  ON public.notifications (user_id, kind, created_at DESC)
  WHERE read = false;

CREATE TABLE IF NOT EXISTS public.admin_popup_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_popup_sends_created_idx
  ON public.admin_popup_sends (created_at DESC);

ALTER TABLE public.admin_popup_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_popup_sends_admin_all ON public.admin_popup_sends;
CREATE POLICY admin_popup_sends_admin_all
  ON public.admin_popup_sends
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_send_user_popup(
  p_title TEXT,
  p_message TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_title TEXT := nullif(trim(COALESCE(p_title, '')), '');
  v_message TEXT := nullif(trim(COALESCE(p_message, '')), '');
  v_count INTEGER := 0;
  v_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_title IS NULL OR char_length(v_title) < 2 THEN
    RAISE EXCEPTION 'Add a title for the popup';
  END IF;

  IF v_message IS NULL OR char_length(v_message) < 2 THEN
    RAISE EXCEPTION 'Write the popup message';
  END IF;

  IF p_user_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
      RAISE EXCEPTION 'User not found';
    END IF;

    INSERT INTO public.notifications (user_id, title, message, kind)
    VALUES (p_user_id, v_title, v_message, 'popup');
    v_count := 1;
  ELSE
    INSERT INTO public.notifications (user_id, title, message, kind)
    SELECT p.id, v_title, v_message, 'popup'
    FROM public.profiles p
    WHERE p.role IS DISTINCT FROM 'admin';
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  INSERT INTO public.admin_popup_sends (admin_id, user_id, title, message, recipient_count)
  VALUES (v_admin_id, p_user_id, v_title, v_message, v_count)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_id,
    'recipient_count', v_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_send_user_popup(TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_send_user_popup(TEXT, TEXT, UUID) TO authenticated;
