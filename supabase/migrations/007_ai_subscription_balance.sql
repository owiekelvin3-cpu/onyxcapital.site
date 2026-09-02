-- Debit user balance when activating an AI trading bot

CREATE OR REPLACE FUNCTION debit_balance_for_ai_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_amount NUMERIC;
BEGIN
  SELECT amount INTO current_amount
  FROM balances
  WHERE user_id = NEW.user_id
  FOR UPDATE;

  IF current_amount IS NULL OR current_amount < NEW.allocation THEN
    RAISE EXCEPTION 'Insufficient balance for AI allocation';
  END IF;

  UPDATE balances
  SET amount = amount - NEW.allocation
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_subscription_debit ON ai_trading_subscriptions;
CREATE TRIGGER trg_ai_subscription_debit
  BEFORE INSERT ON ai_trading_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION debit_balance_for_ai_subscription();
