-- AI Trading subscriptions
CREATE TABLE IF NOT EXISTS ai_trading_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bot_name TEXT NOT NULL,
  allocation NUMERIC(18, 2) NOT NULL,
  market TEXT NOT NULL DEFAULT 'multi',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_trading_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai subs" ON ai_trading_subscriptions
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert ai subs" ON ai_trading_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update ai subs" ON ai_trading_subscriptions
  FOR UPDATE USING (is_admin());
