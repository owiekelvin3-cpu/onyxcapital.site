-- Auto-approve KYC submissions on insert and keep profiles in sync.

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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_kyc_after_insert ON public.kyc_submissions;
CREATE TRIGGER sync_profile_kyc_after_insert
  AFTER INSERT ON public.kyc_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_kyc_on_submission();

-- Backfill: approve pending submissions and matching profiles
UPDATE public.kyc_submissions
SET status = 'approved'
WHERE status = 'pending';

UPDATE public.profiles p
SET kyc_status = 'approved', updated_at = now()
WHERE p.kyc_status = 'pending'
   OR (
     p.kyc_status IS DISTINCT FROM 'approved'
     AND EXISTS (
       SELECT 1
       FROM public.kyc_submissions s
       WHERE s.user_id = p.id
         AND s.status = 'approved'
     )
   );
