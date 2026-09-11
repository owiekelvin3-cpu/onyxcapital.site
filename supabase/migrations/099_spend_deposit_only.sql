-- Spendable money is Deposit balance only (user deposits + admin Add/Remove funds).
-- Profit can be withdrawn, not spent on signals, copy trading, AI, mining, memes, or live trades.
-- Run in the Onyx Capital Supabase SQL editor (project fioiyojnhiivbegkqjiq).

CREATE OR REPLACE FUNCTION public.user_deposit_spend(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_trades numeric(18, 2) := 0;
  v_signals numeric(18, 2) := 0;
  v_copy numeric(18, 2) := 0;
  v_ai numeric(18, 2) := 0;
  v_mining numeric(18, 2) := 0;
  v_memes numeric(18, 2) := 0;
BEGIN
  SELECT COALESCE(SUM(round(t.amount * t.price, 2)), 0) INTO v_trades
  FROM public.trades t
  WHERE t.user_id = p_user_id
    AND t.type = 'buy'
    AND COALESCE(t.status, 'completed') NOT IN ('rejected', 'cancelled');

  IF to_regclass('public.signal_packages') IS NOT NULL THEN
    SELECT COALESCE(SUM(s.price), 0) INTO v_signals
    FROM public.signal_packages s
    WHERE s.user_id = p_user_id
      AND COALESCE(s.price, 0) > 0;
  END IF;

  IF to_regclass('public.copy_trading_subscriptions') IS NOT NULL THEN
    SELECT COALESCE(SUM(c.allocation), 0) INTO v_copy
    FROM public.copy_trading_subscriptions c
    WHERE c.user_id = p_user_id
      AND COALESCE(c.allocation, 0) > 0;
  END IF;

  IF to_regclass('public.ai_trading_subscriptions') IS NOT NULL THEN
    SELECT COALESCE(SUM(COALESCE(a.purchase_cost, a.allocation)), 0) INTO v_ai
    FROM public.ai_trading_subscriptions a
    WHERE a.user_id = p_user_id
      AND COALESCE(a.purchase_cost, a.allocation, 0) > 0;
  END IF;

  IF to_regclass('public.mining_packages') IS NOT NULL THEN
    SELECT COALESCE(SUM(m.investment), 0) INTO v_mining
    FROM public.mining_packages m
    WHERE m.user_id = p_user_id
      AND COALESCE(m.investment, 0) > 0;
  END IF;

  IF to_regclass('public.meme_trades') IS NOT NULL THEN
    SELECT COALESCE(SUM(round(mt.quantity * mt.price_usd, 2)), 0) INTO v_memes
    FROM public.meme_trades mt
    WHERE mt.user_id = p_user_id
      AND mt.type = 'buy'
      AND COALESCE(mt.status, 'completed') NOT IN ('rejected', 'cancelled');
  END IF;

  RETURN round(v_trades + v_signals + v_copy + v_ai + v_mining + v_memes, 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.user_deposit_balance(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_cash numeric(18, 2);
  v_deposits numeric(18, 2);
  v_credits numeric(18, 2);
  v_spend numeric(18, 2);
  v_principal numeric(18, 2);
BEGIN
  SELECT COALESCE(amount, 0) INTO v_cash
  FROM public.balances
  WHERE user_id = p_user_id;

  v_cash := COALESCE(v_cash, 0);

  SELECT COALESCE(SUM(d.amount), 0) INTO v_deposits
  FROM public.deposits d
  WHERE d.user_id = p_user_id
    AND d.status IN ('approved', 'completed');

  v_credits := COALESCE(public.user_deposit_credits(p_user_id), 0);
  v_spend := COALESCE(public.user_deposit_spend(p_user_id), 0);
  v_principal := round(v_deposits + v_credits - v_spend, 2);

  RETURN GREATEST(0, LEAST(v_cash, v_principal));
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_from_deposit(
  p_user_id uuid,
  p_amount numeric,
  p_error text DEFAULT 'Insufficient deposit balance. Profit can only be withdrawn.'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cash numeric(18, 2);
  v_deposit numeric(18, 2);
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.balances (user_id, currency, amount)
  VALUES (p_user_id, 'USD', 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT amount INTO v_cash
  FROM public.balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_deposit := public.user_deposit_balance(p_user_id);

  IF v_cash IS NULL OR v_deposit < p_amount OR v_cash < p_amount THEN
    RAISE EXCEPTION '%', p_error;
  END IF;

  UPDATE public.balances
  SET amount = amount - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_balance_for_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  debit_amount numeric;
BEGIN
  IF TG_TABLE_NAME = 'mining_packages' THEN
    debit_amount := NEW.investment;
  ELSIF TG_TABLE_NAME = 'signal_packages' THEN
    debit_amount := NEW.price;
  ELSE
    RETURN NEW;
  END IF;

  IF debit_amount IS NULL OR debit_amount <= 0 THEN
    RETURN NEW;
  END IF;

  PERFORM public.debit_from_deposit(
    NEW.user_id,
    debit_amount,
    'Insufficient deposit balance. Profit can only be withdrawn.'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_copy_trading_from_catalog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price numeric(18, 2);
  v_active boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM 'active' OR COALESCE(OLD.status, '') = 'active' THEN
      RETURN NEW;
    END IF;
  ELSIF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  SELECT price, is_active
    INTO v_price, v_active
  FROM public.copy_traders
  WHERE name = NEW.trader_name
  FOR SHARE;

  IF v_price IS NULL OR v_active IS NOT TRUE THEN
    RAISE EXCEPTION 'This trader is not available';
  END IF;

  IF v_price <= 0 THEN
    RAISE EXCEPTION 'Copy trader price must be greater than zero';
  END IF;

  NEW.allocation := v_price;

  PERFORM public.debit_from_deposit(
    NEW.user_id,
    v_price,
    'Insufficient deposit balance. Profit can only be withdrawn.'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_balance_for_ai_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.allocation IS NULL OR NEW.allocation <= 0 THEN
    RAISE EXCEPTION 'Invalid AI allocation';
  END IF;

  PERFORM public.debit_from_deposit(
    NEW.user_id,
    NEW.allocation,
    'Insufficient deposit balance. Profit can only be withdrawn.'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_meme_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trade_total numeric(18, 2);
  held_qty numeric(24, 12);
  prev_qty numeric(24, 12);
  prev_avg numeric(18, 6);
  new_avg numeric(18, 6);
BEGIN
  NEW.status := 'completed';

  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Trade quantity must be greater than zero';
  END IF;

  IF NEW.price_usd IS NULL OR NEW.price_usd <= 0 THEN
    RAISE EXCEPTION 'Trade price must be greater than zero';
  END IF;

  trade_total := round(NEW.quantity * NEW.price_usd, 2);

  IF trade_total < 1 THEN
    RAISE EXCEPTION 'Minimum meme trade is $1 USD';
  END IF;

  IF NEW.type = 'buy' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.daily_meme_coins
      WHERE id = NEW.meme_coin_id AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Meme coin is not available for trading';
    END IF;

    PERFORM public.debit_from_deposit(
      NEW.user_id,
      trade_total,
      'Insufficient deposit balance. Profit can only be withdrawn.'
    );

    SELECT quantity, avg_cost_usd INTO prev_qty, prev_avg
    FROM public.meme_holdings
    WHERE user_id = NEW.user_id AND meme_coin_id = NEW.meme_coin_id
    FOR UPDATE;

    prev_qty := COALESCE(prev_qty, 0);
    prev_avg := COALESCE(prev_avg, NEW.price_usd);

    IF prev_qty + NEW.quantity > 0 THEN
      new_avg := round(
        ((prev_qty * prev_avg) + (NEW.quantity * NEW.price_usd)) / (prev_qty + NEW.quantity),
        6
      );
    ELSE
      new_avg := NEW.price_usd;
    END IF;

    INSERT INTO public.meme_holdings (user_id, meme_coin_id, quantity, avg_cost_usd, updated_at)
    VALUES (NEW.user_id, NEW.meme_coin_id, NEW.quantity, new_avg, now())
    ON CONFLICT (user_id, meme_coin_id)
    DO UPDATE SET
      quantity = public.meme_holdings.quantity + EXCLUDED.quantity,
      avg_cost_usd = new_avg,
      updated_at = now();

  ELSIF NEW.type = 'sell' THEN
    SELECT quantity INTO held_qty
    FROM public.meme_holdings
    WHERE user_id = NEW.user_id AND meme_coin_id = NEW.meme_coin_id
    FOR UPDATE;

    IF held_qty IS NULL OR held_qty < NEW.quantity THEN
      RAISE EXCEPTION 'Insufficient meme holdings to sell';
    END IF;

    UPDATE public.meme_holdings
    SET quantity = quantity - NEW.quantity,
        updated_at = now()
    WHERE user_id = NEW.user_id AND meme_coin_id = NEW.meme_coin_id;

    DELETE FROM public.meme_holdings
    WHERE user_id = NEW.user_id AND meme_coin_id = NEW.meme_coin_id AND quantity <= 0;

    UPDATE public.balances
    SET amount = amount + trade_total,
        updated_at = now()
    WHERE user_id = NEW.user_id;

    IF NOT FOUND THEN
      INSERT INTO public.balances (user_id, currency, amount)
      VALUES (NEW.user_id, 'USD', trade_total);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.debit_from_deposit(uuid, numeric, text) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.user_deposit_spend(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_deposit_spend(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.user_deposit_balance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_deposit_balance(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
