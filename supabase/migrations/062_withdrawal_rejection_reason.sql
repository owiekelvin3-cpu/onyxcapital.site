-- Store a client-facing reason when a withdrawal is rejected.

ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE OR REPLACE FUNCTION public.notify_withdrawal_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  amt text;
  reject_reason text;
BEGIN
  SELECT email INTO user_email FROM public.profiles WHERE id = NEW.user_id;
  amt := format_usd_amount(NEW.amount);

  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      NEW.user_id,
      'Withdrawal submitted',
      'Your withdrawal request of ' || amt || ' via ' || NEW.method || ' is pending review.'
    );
    PERFORM notify_all_admins(
      'New withdrawal pending',
      'Withdrawal of ' || amt || ' via ' || NEW.method || ' from ' || COALESCE(user_email, NEW.user_id::text) || ' awaits processing.'
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'completed' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Withdrawal completed',
        'Your withdrawal of ' || amt || ' has been processed successfully.'
      );
    ELSIF NEW.status = 'rejected' THEN
      reject_reason := nullif(trim(COALESCE(NEW.rejection_reason, '')), '');
      PERFORM create_notification(
        NEW.user_id,
        'Withdrawal rejected',
        'Your withdrawal of ' || amt || ' via ' || NEW.method || ' was not approved.'
        || CASE
          WHEN reject_reason IS NOT NULL THEN ' Reason: ' || reject_reason
          ELSE ' Please contact support if you need further information.'
        END
      );
    ELSIF NEW.status = 'approved' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Withdrawal approved',
        'Your withdrawal of ' || amt || ' was approved and is being processed.'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
