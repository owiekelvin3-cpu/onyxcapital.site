-- Require approved KYC before any user-initiated money movement / product purchase.

CREATE OR REPLACE FUNCTION public.is_kyc_approved(uid uuid)
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
      AND p.kyc_status = 'approved'
  );
$$;

REVOKE ALL ON FUNCTION public.is_kyc_approved(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_kyc_approved(uuid) TO authenticated;

-- Deposits
DROP POLICY IF EXISTS "Users can insert deposits" ON public.deposits;
CREATE POLICY "Users can insert deposits" ON public.deposits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_kyc_approved(auth.uid()));

-- Withdrawals
DROP POLICY IF EXISTS "Users can insert withdrawals" ON public.withdrawals;
CREATE POLICY "Users can insert withdrawals" ON public.withdrawals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_kyc_approved(auth.uid()));

-- Trades
DROP POLICY IF EXISTS "Users can insert own trades" ON public.trades;
CREATE POLICY "Users can insert own trades" ON public.trades
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_kyc_approved(auth.uid()));

-- Copy trading
DROP POLICY IF EXISTS "Users can insert copy subs" ON public.copy_trading_subscriptions;
CREATE POLICY "Users can insert copy subs" ON public.copy_trading_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_kyc_approved(auth.uid()));

-- Mining
DROP POLICY IF EXISTS "Users can insert mining" ON public.mining_packages;
CREATE POLICY "Users can insert mining" ON public.mining_packages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_kyc_approved(auth.uid()));

-- Signals
DROP POLICY IF EXISTS "Users can insert signals" ON public.signal_packages;
CREATE POLICY "Users can insert signals" ON public.signal_packages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_kyc_approved(auth.uid()));

-- AI trading subscriptions
DROP POLICY IF EXISTS "Users can insert ai subs" ON public.ai_trading_subscriptions;
CREATE POLICY "Users can insert ai subs" ON public.ai_trading_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_kyc_approved(auth.uid()));
