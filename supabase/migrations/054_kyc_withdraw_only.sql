-- KYC required for withdrawals only. Deposits, trading, and product purchases stay open.

DROP POLICY IF EXISTS "Users can insert withdrawals" ON public.withdrawals;
CREATE POLICY "Users can insert withdrawals" ON public.withdrawals
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_kyc_approved(auth.uid())
    AND public.is_withdrawal_allowed(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert mining" ON public.mining_packages;
CREATE POLICY "Users can insert mining" ON public.mining_packages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert signals" ON public.signal_packages;
CREATE POLICY "Users can insert signals" ON public.signal_packages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

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
  v_suspended boolean := false;
  v_reason text;
  v_kyc_status text := 'none';
  v_kyc_approved boolean := false;
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

  SELECT
    COALESCE(p.is_suspended, false),
    p.suspension_reason,
    COALESCE(p.kyc_status, 'none')
  INTO v_suspended, v_reason, v_kyc_status
  FROM profiles p
  WHERE p.id = v_uid;

  v_kyc_approved := public.is_kyc_approved(v_uid);

  RETURN jsonb_build_object(
    'pending_fees_count', v_pending,
    'can_withdraw', v_pending = 0 AND NOT v_suspended AND v_kyc_approved,
    'is_suspended', v_suspended,
    'suspension_reason', v_reason,
    'kyc_status', v_kyc_status,
    'kyc_approved', v_kyc_approved,
    'portfolio', jsonb_build_object('balance', v_balance)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_withdrawal_eligibility() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_withdrawal_eligibility() TO authenticated;
