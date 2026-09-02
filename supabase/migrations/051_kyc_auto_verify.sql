-- Auto-approve KYC on submission. The client shows an 8–10s verifying animation before revealing success.

CREATE OR REPLACE FUNCTION public.auto_approve_kyc_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.status := 'approved';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_approve_kyc_before_insert ON public.kyc_submissions;
CREATE TRIGGER auto_approve_kyc_before_insert
  BEFORE INSERT ON public.kyc_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_approve_kyc_submission();

CREATE OR REPLACE FUNCTION public.sync_profile_kyc_on_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    UPDATE public.profiles
    SET kyc_status = 'approved', updated_at = now()
    WHERE id = NEW.user_id
      AND kyc_status IS DISTINCT FROM 'approved';
  ELSIF NEW.status = 'pending' THEN
    UPDATE public.profiles
    SET kyc_status = 'pending', updated_at = now()
    WHERE id = NEW.user_id
      AND kyc_status IS DISTINCT FROM 'approved';
  END IF;
  RETURN NEW;
END;
$$;
