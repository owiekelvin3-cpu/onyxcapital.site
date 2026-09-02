-- AI Trading v2: timed bot purchases, power-based profit, crypto trades

ALTER TABLE ai_trading_subscriptions
  ADD COLUMN IF NOT EXISTS bot_id TEXT,
  ADD COLUMN IF NOT EXISTS duration_hours INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS crypto_asset TEXT NOT NULL DEFAULT 'BTC',
  ADD COLUMN IF NOT EXISTS profit_earned NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC(18, 2);

CREATE TABLE IF NOT EXISTS ai_bot_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES ai_trading_subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  crypto_asset TEXT NOT NULL,
  trade_amount NUMERIC(18, 2) NOT NULL CHECK (trade_amount > 0),
  profit NUMERIC(18, 2) NOT NULL CHECK (profit >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_bot_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai bot trades" ON ai_bot_trades
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own ai bot trades via rpc" ON ai_bot_trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bot profit rates (percent per hour on power, percent per manual trade)
CREATE OR REPLACE FUNCTION get_ai_bot_hourly_rate(p_bot_id TEXT)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE COALESCE(p_bot_id, 'nexus')
    WHEN 'nexus' THEN 0.35
    WHEN 'quantum' THEN 0.55
    WHEN 'apex' THEN 0.85
    ELSE 0.30
  END;
$$;

CREATE OR REPLACE FUNCTION get_ai_bot_trade_rate(p_bot_id TEXT)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE COALESCE(p_bot_id, 'nexus')
    WHEN 'nexus' THEN 1.8
    WHEN 'quantum' THEN 2.5
    WHEN 'apex' THEN 3.5
    ELSE 1.5
  END;
$$;

-- Set expiry and purchase cost on new subscriptions
CREATE OR REPLACE FUNCTION prepare_ai_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.duration_hours IS NULL OR NEW.duration_hours < 1 THEN
    NEW.duration_hours := 24;
  END IF;

  NEW.purchase_cost := COALESCE(NEW.purchase_cost, NEW.allocation);
  NEW.allocation := NEW.purchase_cost;
  NEW.expires_at := COALESCE(NEW.expires_at, NOW() + (NEW.duration_hours || ' hours')::INTERVAL);
  NEW.last_sync_at := NOW();
  NEW.profit_earned := COALESCE(NEW.profit_earned, 0);
  NEW.crypto_asset := COALESCE(NEW.crypto_asset, 'BTC');

  IF NEW.bot_id IS NULL AND NEW.bot_name IS NOT NULL THEN
    NEW.bot_id := LOWER(REPLACE(SPLIT_PART(NEW.bot_name, ' ', 1), ' ', ''));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prepare_ai_subscription ON ai_trading_subscriptions;
CREATE TRIGGER trg_prepare_ai_subscription
  BEFORE INSERT ON ai_trading_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION prepare_ai_subscription();

-- Accrue passive profit and complete expired bots (returns capital + profit)
CREATE OR REPLACE FUNCTION sync_ai_subscription(p_sub_id UUID)
RETURNS ai_trading_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub ai_trading_subscriptions;
  sync_from TIMESTAMPTZ;
  sync_to TIMESTAMPTZ;
  hours_elapsed NUMERIC;
  hourly_rate NUMERIC;
  accrued NUMERIC;
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

  sync_from := COALESCE(sub.last_sync_at, sub.created_at);
  sync_to := LEAST(now_ts, sub.expires_at);
  hours_elapsed := GREATEST(EXTRACT(EPOCH FROM (sync_to - sync_from)) / 3600.0, 0);

  IF hours_elapsed > 0 THEN
    hourly_rate := get_ai_bot_hourly_rate(sub.bot_id);
    accrued := ROUND(sub.allocation * (hourly_rate / 100.0) * hours_elapsed, 2);
    UPDATE ai_trading_subscriptions
    SET profit_earned = profit_earned + accrued,
        last_sync_at = sync_to
    WHERE id = p_sub_id
    RETURNING * INTO sub;
  END IF;

  IF now_ts >= sub.expires_at THEN
    payout := sub.allocation + sub.profit_earned;
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
      format_usd_amount(payout) || ' (capital + profit) was credited to your balance.'
    );
  END IF;

  RETURN sub;
END;
$$;

CREATE OR REPLACE FUNCTION sync_user_ai_bots()
RETURNS SETOF ai_trading_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  FOR sub_id IN
    SELECT id FROM ai_trading_subscriptions
    WHERE user_id = auth.uid() AND status = 'active'
  LOOP
    RETURN NEXT sync_ai_subscription(sub_id);
  END LOOP;
  RETURN;
END;
$$;

-- Manual crypto trade on an active bot (always profitable)
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

-- Updated purchase notification
CREATE OR REPLACE FUNCTION notify_ai_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      NEW.user_id,
      'AI bot purchased',
      NEW.bot_name || ' is running for ' || NEW.duration_hours || 'h with ' ||
      format_usd_amount(NEW.allocation) || ' power on ' || NEW.crypto_asset || '.'
    );
    PERFORM notify_all_admins(
      'AI bot purchased',
      NEW.bot_name || ' purchased — ' || format_usd_amount(NEW.allocation) ||
      ' power, ' || NEW.duration_hours || 'h, ' || NEW.crypto_asset || '.'
    );
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION sync_ai_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_user_ai_bots() TO authenticated;
GRANT EXECUTE ON FUNCTION execute_ai_bot_trade(UUID, NUMERIC) TO authenticated;
