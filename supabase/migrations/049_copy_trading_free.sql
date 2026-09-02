-- Copy trading subscriptions are free — no balance debit on follow.
DROP TRIGGER IF EXISTS trg_copy_trading_debit ON public.copy_trading_subscriptions;

-- Keep debit_balance_for_subscription for mining/signals only (copy branch unused).
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
  IF TG_TABLE_NAME = 'mining_packages' THEN
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
