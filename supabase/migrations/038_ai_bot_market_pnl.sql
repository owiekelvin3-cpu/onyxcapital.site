-- Market-linked AI bot P/L: result tracks coin price vs entry, plus admin adjustments.

ALTER TABLE public.ai_trading_subscriptions
  ADD COLUMN IF NOT EXISTS entry_price NUMERIC(18, 8),
  ADD COLUMN IF NOT EXISTS last_mark_price NUMERIC(18, 8),
  ADD COLUMN IF NOT EXISTS admin_pnl NUMERIC(18, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.ai_trading_subscriptions.entry_price IS 'Coin mark price when the bot run started';
COMMENT ON COLUMN public.ai_trading_subscriptions.last_mark_price IS 'Latest coin mark used for market P/L';
COMMENT ON COLUMN public.ai_trading_subscriptions.admin_pnl IS 'Admin profit/loss adjustments on top of market P/L';

CREATE OR REPLACE FUNCTION public.compute_ai_market_pnl(
  p_allocation NUMERIC,
  p_entry_price NUMERIC,
  p_mark_price NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_allocation IS NULL OR p_entry_price IS NULL OR p_mark_price IS NULL THEN
    RETURN 0;
  END IF;
  IF p_allocation <= 0 OR p_entry_price <= 0 OR p_mark_price <= 0 THEN
    RETURN 0;
  END IF;
  RETURN ROUND(p_allocation * ((p_mark_price - p_entry_price) / p_entry_price), 2);
END;
$$;

-- User/client marks current coin price so P/L tracks the market
CREATE OR REPLACE FUNCTION public.mark_ai_bot_market_pnl(
  p_subscription_id UUID,
  p_mark_price NUMERIC
)
RETURNS ai_trading_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub ai_trading_subscriptions;
  v_mark NUMERIC(18, 8);
  v_market NUMERIC(18, 2);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_mark_price IS NULL OR p_mark_price <= 0 THEN
    RAISE EXCEPTION 'Mark price must be greater than zero';
  END IF;

  v_mark := ROUND(p_mark_price, 8);

  SELECT * INTO sub
  FROM ai_trading_subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AI bot run not found';
  END IF;

  IF sub.user_id IS DISTINCT FROM auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF sub.status <> 'active' THEN
    RETURN sub;
  END IF;

  IF sub.entry_price IS NULL OR sub.entry_price <= 0 THEN
    UPDATE ai_trading_subscriptions
    SET entry_price = v_mark,
        last_mark_price = v_mark,
        profit_earned = ROUND(COALESCE(admin_pnl, 0), 2),
        last_sync_at = now()
    WHERE id = sub.id
    RETURNING * INTO sub;
    RETURN sub;
  END IF;

  v_market := public.compute_ai_market_pnl(sub.allocation, sub.entry_price, v_mark);

  UPDATE ai_trading_subscriptions
  SET last_mark_price = v_mark,
      profit_earned = ROUND(v_market + COALESCE(admin_pnl, 0), 2),
      last_sync_at = now()
  WHERE id = sub.id
  RETURNING * INTO sub;

  RETURN sub;
END;
$$;

-- Admin adjustments stack on top of market P/L
CREATE OR REPLACE FUNCTION public.admin_adjust_ai_bot_profit(
  p_subscription_id UUID,
  p_amount NUMERIC,
  p_note TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_amount numeric(18, 2);
  v_note text := nullif(trim(COALESCE(p_note, '')), '');
  v_sub ai_trading_subscriptions%ROWTYPE;
  v_trade ai_bot_trades%ROWTYPE;
  v_before numeric(18, 2);
  v_after numeric(18, 2);
  v_market numeric(18, 2);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Amount must be a non-zero profit or loss';
  END IF;

  v_amount := round(p_amount, 2);

  SELECT * INTO v_sub
  FROM public.ai_trading_subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AI bot run not found';
  END IF;

  IF v_sub.status <> 'active' THEN
    RAISE EXCEPTION 'Profit and loss can only be adjusted on active AI bot runs';
  END IF;

  IF v_admin_id = v_sub.user_id THEN
    RAISE EXCEPTION 'You cannot adjust profit on your own AI bot run';
  END IF;

  IF v_sub.expires_at IS NOT NULL AND now() >= v_sub.expires_at THEN
    RAISE EXCEPTION 'This AI bot run has already expired';
  END IF;

  v_before := COALESCE(v_sub.profit_earned, 0);
  v_market := public.compute_ai_market_pnl(
    v_sub.allocation,
    COALESCE(v_sub.entry_price, 0),
    COALESCE(v_sub.last_mark_price, v_sub.entry_price, 0)
  );

  UPDATE public.ai_trading_subscriptions
  SET admin_pnl = ROUND(COALESCE(admin_pnl, 0) + v_amount, 2),
      profit_earned = ROUND(v_market + COALESCE(admin_pnl, 0) + v_amount, 2),
      last_sync_at = now()
  WHERE id = v_sub.id
  RETURNING * INTO v_sub;

  v_after := COALESCE(v_sub.profit_earned, 0);

  INSERT INTO public.ai_bot_trades (
    subscription_id, user_id, crypto_asset, trade_amount, profit
  )
  VALUES (
    v_sub.id,
    v_sub.user_id,
    COALESCE(v_sub.crypto_asset, 'BTC'),
    abs(v_amount),
    v_amount
  )
  RETURNING * INTO v_trade;

  RETURN jsonb_build_object(
    'subscription_id', v_sub.id,
    'trade_id', v_trade.id,
    'amount', v_amount,
    'profit_before', v_before,
    'profit_after', v_after,
    'note', v_note
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_adjust_ai_bot_profit(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_ai_bot_market_pnl(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_ai_market_pnl(NUMERIC, NUMERIC, NUMERIC) TO authenticated;
