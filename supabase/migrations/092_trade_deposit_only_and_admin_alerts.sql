-- Live trades can only spend deposited cash, not admin profit credits.
-- Admins are notified on every live trade fill.

CREATE OR REPLACE FUNCTION public.user_lifetime_profit(p_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT round((
    COALESCE((SELECT SUM(t.profit) FROM public.trades t WHERE t.user_id = p_user_id), 0)
    + COALESCE((SELECT SUM(a.amount) FROM public.user_profit_adjustments a WHERE a.user_id = p_user_id), 0)
    + COALESCE((SELECT SUM(c.amount) FROM public.copy_trading_profit_credits c WHERE c.user_id = p_user_id), 0)
    + COALESCE((SELECT SUM(r.amount) FROM public.referral_rewards r WHERE r.referrer_id = p_user_id), 0)
  )::numeric, 2);
$$;

CREATE OR REPLACE FUNCTION public.user_deposit_balance(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_cash numeric(18, 2);
  v_profit numeric(18, 2);
  v_profit_on_account numeric(18, 2);
BEGIN
  SELECT COALESCE(amount, 0) INTO v_cash
  FROM public.balances
  WHERE user_id = p_user_id;

  v_cash := COALESCE(v_cash, 0);
  v_profit := COALESCE(public.user_lifetime_profit(p_user_id), 0);

  IF v_cash <= 0 THEN
    RETURN 0;
  END IF;

  IF v_profit <= 0 THEN
    v_profit_on_account := 0;
  ELSE
    v_profit_on_account := LEAST(v_profit, v_cash);
  END IF;

  RETURN GREATEST(0, round(v_cash - v_profit_on_account, 2));
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_balance_for_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trade_total numeric(18, 2);
  current_amount numeric(18, 2);
  deposit_amount numeric(18, 2);
  base_asset text;
  held_qty numeric(24, 12);
BEGIN
  NEW.status := 'completed';

  base_asset := upper(split_part(NEW.asset, '/', 1));
  IF base_asset IS NULL OR length(base_asset) = 0 THEN
    base_asset := upper(NEW.asset);
  END IF;

  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Trade quantity must be greater than zero';
  END IF;

  IF NEW.price IS NULL OR NEW.price <= 0 THEN
    RAISE EXCEPTION 'Trade price must be greater than zero';
  END IF;

  trade_total := round(NEW.amount * NEW.price, 2);

  IF NEW.type = 'buy' THEN
    SELECT amount INTO current_amount
    FROM public.balances
    WHERE user_id = NEW.user_id
    FOR UPDATE;

    deposit_amount := public.user_deposit_balance(NEW.user_id);

    IF current_amount IS NULL OR deposit_amount < trade_total THEN
      RAISE EXCEPTION 'Insufficient balance for trade';
    END IF;

    UPDATE public.balances
    SET amount = amount - trade_total,
        updated_at = now()
    WHERE user_id = NEW.user_id;

    INSERT INTO public.holdings (user_id, asset, quantity, updated_at)
    VALUES (NEW.user_id, base_asset, NEW.amount, now())
    ON CONFLICT (user_id, asset)
    DO UPDATE SET
      quantity = public.holdings.quantity + EXCLUDED.quantity,
      updated_at = now();

  ELSIF NEW.type = 'sell' THEN
    SELECT quantity INTO held_qty
    FROM public.holdings
    WHERE user_id = NEW.user_id AND asset = base_asset
    FOR UPDATE;

    IF held_qty IS NULL OR held_qty < NEW.amount THEN
      RAISE EXCEPTION 'Insufficient holdings to sell';
    END IF;

    UPDATE public.holdings
    SET quantity = quantity - NEW.amount,
        updated_at = now()
    WHERE user_id = NEW.user_id AND asset = base_asset;

    DELETE FROM public.holdings
    WHERE user_id = NEW.user_id AND asset = base_asset AND quantity <= 0;

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

CREATE OR REPLACE FUNCTION public.notify_trade_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  side TEXT;
  notional TEXT;
BEGIN
  side := UPPER(NEW.type);
  notional := format_usd_amount(round(NEW.amount * NEW.price, 2));

  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      NEW.user_id,
      'Trade placed',
      side || ' ' || NEW.asset || ' — ' || NEW.amount || ' @ ' || format_usd_amount(NEW.price) || ' (' || NEW.status || ').'
    );

    SELECT email INTO user_email FROM public.profiles WHERE id = NEW.user_id;
    PERFORM notify_all_admins(
      'New live trade',
      side || ' ' || NEW.asset || ' by ' || COALESCE(user_email, NEW.user_id::TEXT)
      || ' — ' || notional || '.'
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'completed' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Trade completed',
        side || ' ' || NEW.asset || ' filled at ' || format_usd_amount(NEW.price) || '.'
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Trade rejected',
        side || ' ' || NEW.asset || ' order was rejected or cancelled.'
      );
    ELSIF NEW.status = 'approved' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Trade approved',
        side || ' ' || NEW.asset || ' order approved and queued for execution.'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

ALTER TABLE public.trades REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'trades'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
  END IF;
END;
$$;
