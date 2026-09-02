-- Backfill legacy AI subscriptions created before v2 migration

UPDATE ai_trading_subscriptions
SET
  expires_at = COALESCE(expires_at, created_at + (duration_hours || ' hours')::INTERVAL),
  bot_id = COALESCE(
    bot_id,
    CASE
      WHEN bot_name ILIKE '%nexus%' THEN 'nexus'
      WHEN bot_name ILIKE '%quantum%' THEN 'quantum'
      WHEN bot_name ILIKE '%apex%' THEN 'apex'
      ELSE LOWER(SPLIT_PART(bot_name, ' ', 1))
    END
  ),
  last_sync_at = COALESCE(last_sync_at, created_at),
  profit_earned = COALESCE(profit_earned, 0),
  crypto_asset = COALESCE(crypto_asset, 'BTC'),
  purchase_cost = COALESCE(purchase_cost, allocation)
WHERE expires_at IS NULL
   OR bot_id IS NULL
   OR last_sync_at IS NULL;
