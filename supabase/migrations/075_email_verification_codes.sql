CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_verification_codes_email_idx
  ON public.email_verification_codes (lower(email), expires_at DESC);

ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;
