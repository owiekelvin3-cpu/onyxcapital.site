-- History of branded emails sent to users from the admin console.

CREATE TABLE IF NOT EXISTS public.admin_outbound_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT NOT NULL DEFAULT 'custom',
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  provider_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_outbound_emails_created
  ON public.admin_outbound_emails (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_outbound_emails_user
  ON public.admin_outbound_emails (user_id, created_at DESC);

ALTER TABLE public.admin_outbound_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_outbound_emails_admin_select
  ON public.admin_outbound_emails
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY admin_outbound_emails_admin_insert
  ON public.admin_outbound_emails
  FOR INSERT
  WITH CHECK (public.is_admin() AND admin_id = auth.uid());
