-- Admin-controlled AI trading P/L: no automatic accrual; signed profit/loss adjustments.

-- Stop passive hourly accrual (admin decides outcomes)
CREATE OR REPLACE FUNCTION public.get_ai_bot_hourly_rate(p_bot_id TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN 0;
END;
$$;

-- Allow signed P/L on bot trade ledger rows
ALTER TABLE public.ai_bot_trades
  DROP CONSTRAINT IF EXISTS ai_bot_trades_profit_check;

ALTER TABLE public.ai_bot_trades
  DROP CONSTRAINT IF EXISTS ai_bot_trades_trade_amount_check;

ALTER TABLE public.ai_bot_trades
  ADD CONSTRAINT ai_bot_trades_trade_amount_check CHECK (trade_amount >= 0);

-- Sync: no accrual; complete with capital + admin-set P/L (floor at 0)
CREATE OR REPLACE FUNCTION public.sync_ai_subscription(p_sub_id UUID)
RETURNS ai_trading_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub ai_trading_subscriptions;
  payout NUMERIC;
  now_ts TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO sub
  FROM ai_trading_subscriptions
  WHERE id = p_sub_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;

  IF sub.user_id IS DISTINCT FROM auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF sub.status <> 'active' THEN
    RETURN sub;
  END IF;

  -- Keep last_sync_at fresh without accruing passive profit
  UPDATE ai_trading_subscriptions
  SET last_sync_at = LEAST(now_ts, sub.expires_at)
  WHERE id = p_sub_id
  RETURNING * INTO sub;

  IF now_ts >= sub.expires_at THEN
    payout := GREATEST(0, ROUND(sub.allocation + COALESCE(sub.profit_earned, 0), 2));

    UPDATE balances
    SET amount = amount + payout,
        updated_at = NOW()
    WHERE user_id = sub.user_id;

    UPDATE ai_trading_subscriptions
    SET status = 'completed',
        last_sync_at = sub.expires_at
    WHERE id = p_sub_id
    RETURNING * INTO sub;

    PERFORM create_notification(
      sub.user_id,
      'AI bot completed',
      sub.bot_name || ' finished its ' || sub.duration_hours || 'h run. ' ||
      format_usd_amount(payout) || ' was credited to your balance.'
    );
  END IF;

  RETURN sub;
END;
$$;

-- Users can no longer self-credit AI trade profits
CREATE OR REPLACE FUNCTION public.execute_ai_bot_trade(
  p_subscription_id UUID,
  p_trade_amount NUMERIC
)
RETURNS ai_bot_trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Manual AI trades are disabled. Profit and loss are set by admin during the run.';
END;
$$;

-- Admin adds profit (positive) or loss (negative) while bot is active
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
  v_after := round(v_before + v_amount, 2);

  UPDATE public.ai_trading_subscriptions
  SET profit_earned = v_after,
      last_sync_at = now()
  WHERE id = v_sub.id;

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

  PERFORM create_notification(
    v_sub.user_id,
    CASE WHEN v_amount > 0 THEN 'AI trading profit' ELSE 'AI trading loss' END,
    v_sub.bot_name || ': ' ||
    CASE WHEN v_amount > 0 THEN '+' ELSE '' END ||
    format_usd_amount(v_amount) ||
    CASE WHEN v_note IS NOT NULL THEN ' — ' || v_note ELSE '' END ||
    '. Running total: ' || format_usd_amount(v_after) || '.'
  );

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
