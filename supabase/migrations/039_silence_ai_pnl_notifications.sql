-- Do not notify users when admin adds AI trading profit or loss.

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
