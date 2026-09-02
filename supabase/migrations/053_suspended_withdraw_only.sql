-- Suspended users keep dashboard access; withdrawals are blocked until admin lifts suspension.

CREATE OR REPLACE FUNCTION public.is_withdrawal_allowed(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = uid
      AND COALESCE(p.is_suspended, false) = false
  );
$$;

REVOKE ALL ON FUNCTION public.is_withdrawal_allowed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_withdrawal_allowed(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can insert deposits" ON public.deposits;
CREATE POLICY "Users can insert deposits" ON public.deposits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own trades" ON public.trades;
CREATE POLICY "Users can insert own trades" ON public.trades
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert withdrawals" ON public.withdrawals;
CREATE POLICY "Users can insert withdrawals" ON public.withdrawals
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_withdrawal_allowed(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert ai subs" ON public.ai_trading_subscriptions;
CREATE POLICY "Users can insert ai subs" ON public.ai_trading_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert copy subs" ON public.copy_trading_subscriptions;
CREATE POLICY "Users can insert copy subs" ON public.copy_trading_subscriptions
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

  SELECT COALESCE(p.is_suspended, false), p.suspension_reason
  INTO v_suspended, v_reason
  FROM profiles p
  WHERE p.id = v_uid;

  RETURN jsonb_build_object(
    'pending_fees_count', v_pending,
    'can_withdraw', v_pending = 0 AND NOT v_suspended,
    'is_suspended', v_suspended,
    'suspension_reason', v_reason,
    'portfolio', jsonb_build_object('balance', v_balance)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_withdrawal_eligibility() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_withdrawal_eligibility() TO authenticated;
