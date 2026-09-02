-- Dashboard fixes: user trades, balance holds, subscription debits

-- Allow users to place their own trades
DROP POLICY IF EXISTS "Users can insert own trades" ON trades;
CREATE POLICY "Users can insert own trades" ON trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Debit balance on buy orders
CREATE OR REPLACE FUNCTION debit_balance_for_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trade_total NUMERIC;
  current_amount NUMERIC;
BEGIN
  IF NEW.type = 'buy' THEN
    trade_total := ROUND(NEW.amount * NEW.price, 2);
    SELECT amount INTO current_amount
    FROM balances
    WHERE user_id = NEW.user_id
    FOR UPDATE;

    IF current_amount IS NULL OR current_amount < trade_total THEN
      RAISE EXCEPTION 'Insufficient balance for trade';
    END IF;

    UPDATE balances
    SET amount = amount - trade_total,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trade_debit ON trades;
CREATE TRIGGER trg_trade_debit
  BEFORE INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION debit_balance_for_trade();

-- Hold balance when withdrawal is requested
CREATE OR REPLACE FUNCTION hold_balance_for_withdrawal()
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

  IF current_amount IS NULL OR current_amount < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient balance for withdrawal';
  END IF;

  UPDATE balances
  SET amount = amount - NEW.amount,
      updated_at = NOW()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_hold ON withdrawals;
CREATE TRIGGER trg_withdrawal_hold
  BEFORE INSERT ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION hold_balance_for_withdrawal();

-- Refund balance when withdrawal is rejected
CREATE OR REPLACE FUNCTION refund_rejected_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD.status IS DISTINCT FROM 'rejected'
    AND NEW.status = 'rejected' THEN
    UPDATE balances
    SET amount = amount + NEW.amount,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_refund ON withdrawals;
CREATE TRIGGER trg_withdrawal_refund
  AFTER UPDATE OF status ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION refund_rejected_withdrawal();

-- Debit balance for copy trading, mining, and signal purchases
CREATE OR REPLACE FUNCTION debit_balance_for_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  debit_amount NUMERIC;
  current_amount NUMERIC;
BEGIN
  IF TG_TABLE_NAME = 'copy_trading_subscriptions' THEN
    debit_amount := NEW.allocation;
  ELSIF TG_TABLE_NAME = 'mining_packages' THEN
    debit_amount := NEW.investment;
  ELSIF TG_TABLE_NAME = 'signal_packages' THEN
    debit_amount := NEW.price;
  ELSE
    RETURN NEW;
  END IF;

  IF debit_amount IS NULL OR debit_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid purchase amount';
  END IF;

  SELECT amount INTO current_amount
  FROM balances
  WHERE user_id = NEW.user_id
  FOR UPDATE;

  IF current_amount IS NULL OR current_amount < debit_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE balances
  SET amount = amount - debit_amount,
      updated_at = NOW()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_copy_trading_debit ON copy_trading_subscriptions;
CREATE TRIGGER trg_copy_trading_debit
  BEFORE INSERT ON copy_trading_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION debit_balance_for_subscription();

DROP TRIGGER IF EXISTS trg_mining_debit ON mining_packages;
CREATE TRIGGER trg_mining_debit
  BEFORE INSERT ON mining_packages
  FOR EACH ROW
  EXECUTE FUNCTION debit_balance_for_subscription();

DROP TRIGGER IF EXISTS trg_signal_debit ON signal_packages;
CREATE TRIGGER trg_signal_debit
  BEFORE INSERT ON signal_packages
  FOR EACH ROW
  EXECUTE FUNCTION debit_balance_for_subscription();
