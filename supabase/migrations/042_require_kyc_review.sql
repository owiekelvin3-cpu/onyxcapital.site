-- Production: require admin review for KYC submissions (disable auto-approve).

DROP TRIGGER IF EXISTS auto_approve_kyc_before_insert ON public.kyc_submissions;

CREATE OR REPLACE FUNCTION public.auto_approve_kyc_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Leave status as submitted (pending) for admin review
  IF NEW.status IS NULL OR NEW.status = '' THEN
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_approve_kyc_before_insert
  BEFORE INSERT ON public.kyc_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_approve_kyc_submission();
