-- User-facing withdrawal eligibility check (used by /dashboard/withdraw)

CREATE OR REPLACE FUNCTION public.get_withdrawal_eligibility()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pending int;
  v_balance numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COUNT(*)::int INTO v_pending
  FROM user_fees
  WHERE user_id = v_uid AND status = 'pending';

  SELECT COALESCE(amount, 0) INTO v_balance
  FROM balances
  WHERE user_id = v_uid
  LIMIT 1;

  RETURN jsonb_build_object(
    'pending_fees_count', v_pending,
    'can_withdraw', v_pending = 0,
    'portfolio', jsonb_build_object('balance', v_balance)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_withdrawal_eligibility() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_withdrawal_eligibility() TO authenticated;
