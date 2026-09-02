-- When users submit KYC for review, sync profile to pending (manual review flow).

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
