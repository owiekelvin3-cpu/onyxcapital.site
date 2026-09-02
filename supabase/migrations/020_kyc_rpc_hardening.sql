-- Harden transactional RPCs with KYC checks

CREATE OR REPLACE FUNCTION execute_ai_bot_trade(
  p_subscription_id UUID,
  p_trade_amount NUMERIC
)
RETURNS ai_bot_trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub ai_trading_subscriptions;
  trade_rate NUMERIC;
  profit NUMERIC;
  trade_row ai_bot_trades;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_kyc_approved(auth.uid()) AND NOT is_admin() THEN
    RAISE EXCEPTION 'KYC verification required before trading';
  END IF;

  IF p_trade_amount IS NULL OR p_trade_amount <= 0 THEN
    RAISE EXCEPTION 'Trade amount must be greater than zero';
  END IF;

  PERFORM sync_ai_subscription(p_subscription_id);

  SELECT * INTO sub
  FROM ai_trading_subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;

  IF sub.user_id IS DISTINCT FROM auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF sub.status <> 'active' OR NOW() >= sub.expires_at THEN
    RAISE EXCEPTION 'Bot is not active';
  END IF;

  IF p_trade_amount > sub.allocation THEN
    RAISE EXCEPTION 'Trade amount exceeds bot power';
  END IF;

  trade_rate := get_ai_bot_trade_rate(sub.bot_id);
  profit := ROUND(p_trade_amount * (trade_rate / 100.0), 2);

  INSERT INTO ai_bot_trades (subscription_id, user_id, crypto_asset, trade_amount, profit)
  VALUES (sub.id, sub.user_id, sub.crypto_asset, p_trade_amount, profit)
  RETURNING * INTO trade_row;

  UPDATE ai_trading_subscriptions
  SET profit_earned = profit_earned + profit
  WHERE id = sub.id;

  RETURN trade_row;
END;
$$;
