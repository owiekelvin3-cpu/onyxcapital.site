-- Live buys must reduce Deposit balance (not only Total Portfolio cash).
-- 101 stopped subtracting lifetime spend from deposit, so trades have to write the deposit ledger.

CREATE OR REPLACE FUNCTION public.debit_balance_for_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trade_total numeric(18, 2);
  base_asset text;
  held_qty numeric(24, 12);
  v_cash numeric(18, 2);
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
    PERFORM public.debit_from_deposit(
      NEW.user_id,
      trade_total,
      'Insufficient deposit balance. Profit can only be withdrawn.'
    );

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

    INSERT INTO public.balances (user_id, currency, amount)
    VALUES (NEW.user_id, 'USD', 0)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE public.balances
    SET amount = amount + trade_total,
        updated_at = now()
    WHERE user_id = NEW.user_id
    RETURNING amount INTO v_cash;

    INSERT INTO public.user_deposit_adjustments (
      user_id, admin_id, amount, note, balance_before, balance_after
    )
    VALUES (
      NEW.user_id,
      NEW.user_id,
      trade_total,
      'Deposit returned from sale',
      round(COALESCE(v_cash, trade_total) - trade_total, 2),
      COALESCE(v_cash, trade_total)
    );
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
