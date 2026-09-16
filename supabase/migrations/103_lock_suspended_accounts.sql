-- Suspended users keep the public homepage only.
-- Block trades, copy trading, deposits, withdrawals, and other account writes.

CREATE OR REPLACE FUNCTION public.reject_suspended_user_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_account_active(NEW.user_id) THEN
    RAISE EXCEPTION 'Account is restricted';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trades_require_active ON public.trades;
CREATE TRIGGER trg_trades_require_active
  BEFORE INSERT ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_suspended_user_writes();

DROP TRIGGER IF EXISTS trg_meme_trades_require_active ON public.meme_trades;
CREATE TRIGGER trg_meme_trades_require_active
  BEFORE INSERT ON public.meme_trades
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_suspended_user_writes();

DROP TRIGGER IF EXISTS trg_deposits_require_active ON public.deposits;
CREATE TRIGGER trg_deposits_require_active
  BEFORE INSERT ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_suspended_user_writes();

DROP TRIGGER IF EXISTS trg_withdrawals_require_active ON public.withdrawals;
CREATE TRIGGER trg_withdrawals_require_active
  BEFORE INSERT ON public.withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_suspended_user_writes();

DROP TRIGGER IF EXISTS trg_copy_subs_require_active ON public.copy_trading_subscriptions;
CREATE TRIGGER trg_copy_subs_require_active
  BEFORE INSERT OR UPDATE ON public.copy_trading_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_suspended_user_writes();

DROP TRIGGER IF EXISTS trg_ai_subs_require_active ON public.ai_trading_subscriptions;
CREATE TRIGGER trg_ai_subs_require_active
  BEFORE INSERT ON public.ai_trading_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_suspended_user_writes();

DROP POLICY IF EXISTS "Users can insert own trades" ON public.trades;
CREATE POLICY "Users can insert own trades" ON public.trades
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Users can insert deposits" ON public.deposits;
CREATE POLICY "Users can insert deposits" ON public.deposits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Users can insert withdrawals" ON public.withdrawals;
CREATE POLICY "Users can insert withdrawals" ON public.withdrawals
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_kyc_approved(auth.uid())
    AND public.is_account_active(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert copy subs" ON public.copy_trading_subscriptions;
CREATE POLICY "Users can insert copy subs" ON public.copy_trading_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Users can update own copy subs" ON public.copy_trading_subscriptions;
CREATE POLICY "Users can update own copy subs" ON public.copy_trading_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (
    public.is_admin()
    OR (auth.uid() = user_id AND public.is_account_active(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert ai subs" ON public.ai_trading_subscriptions;
CREATE POLICY "Users can insert ai subs" ON public.ai_trading_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Users insert own meme trades" ON public.meme_trades;
CREATE POLICY "Users insert own meme trades" ON public.meme_trades
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Users can insert signals" ON public.signal_packages;
CREATE POLICY "Users can insert signals" ON public.signal_packages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Users can insert mining" ON public.mining_packages;
CREATE POLICY "Users can insert mining" ON public.mining_packages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Users can insert own KYC" ON public.kyc_submissions;
CREATE POLICY "Users can insert own KYC" ON public.kyc_submissions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_account_active(auth.uid()));

CREATE OR REPLACE FUNCTION public.request_user_withdrawal(
  p_amount numeric,
  p_currency text,
  p_method text,
  p_wallet_address text,
  p_notes text,
  p_withdrawal_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  rec public.withdrawals;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_account_active(uid) THEN
    RAISE EXCEPTION 'Account is restricted';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Enter a valid amount';
  END IF;

  PERFORM public.assert_withdrawal_code(uid, p_withdrawal_code);

  INSERT INTO public.withdrawals (
    user_id,
    amount,
    currency,
    method,
    wallet_address,
    notes,
    status,
    withdrawal_code
  )
  VALUES (
    uid,
    round(p_amount::numeric, 2),
    COALESCE(nullif(trim(p_currency), ''), 'USD'),
    COALESCE(nullif(trim(p_method), ''), 'crypto'),
    nullif(trim(p_wallet_address), ''),
    p_notes,
    'pending',
    p_withdrawal_code
  )
  RETURNING * INTO rec;

  RETURN to_jsonb(rec) - 'withdrawal_code';
END;
$$;
