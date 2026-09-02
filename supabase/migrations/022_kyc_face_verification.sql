-- Face verification fields for KYC submissions

ALTER TABLE public.kyc_submissions
  ADD COLUMN IF NOT EXISTS selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS face_captured_at TIMESTAMPTZ;

COMMENT ON COLUMN public.kyc_submissions.selfie_url IS 'Private storage path for face verification selfie';
COMMENT ON COLUMN public.kyc_submissions.face_captured_at IS 'When the live selfie was captured';
