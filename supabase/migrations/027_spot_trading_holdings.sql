-- Spot trading: holdings inventory + instant buy/sell settlement

CREATE TABLE IF NOT EXISTS public.holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset text NOT NULL,
  quantity numeric(24, 12) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, asset)
);

CREATE INDEX IF NOT EXISTS holdings_user_id_idx ON public.holdings (user_id);

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own holdings" ON public.holdings;
CREATE POLICY "Users can view own holdings" ON public.holdings
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage holdings" ON public.holdings;
CREATE POLICY "Admins can manage holdings" ON public.holdings
  FOR ALL USING (public.is_admin());

-- Instant-fill market orders: buy spends USD / sell spends holdings
CREATE OR REPLACE FUNCTION public.debit_balance_for_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trade_total numeric(18, 2);
  current_amount numeric(18, 2);
  base_asset text;
  held_qty numeric(24, 12);
BEGIN
  -- Normalize to completed fill for spot market orders
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

    IF current_amount IS NULL OR current_amount < trade_total THEN
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

DROP TRIGGER IF EXISTS trg_trade_debit ON public.trades;
CREATE TRIGGER trg_trade_debit
  BEFORE INSERT ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.debit_balance_for_trade();

-- Backfill holdings from completed buys minus completed sells (best effort)
INSERT INTO public.holdings (user_id, asset, quantity, updated_at)
SELECT
  t.user_id,
  upper(split_part(t.asset, '/', 1)) AS asset,
  GREATEST(
    0,
    SUM(CASE WHEN t.type = 'buy' THEN t.amount ELSE 0 END)
    - SUM(CASE WHEN t.type = 'sell' THEN t.amount ELSE 0 END)
  ) AS quantity,
  now()
FROM public.trades t
WHERE t.status IN ('completed', 'approved')
GROUP BY t.user_id, upper(split_part(t.asset, '/', 1))
HAVING (
  SUM(CASE WHEN t.type = 'buy' THEN t.amount ELSE 0 END)
  - SUM(CASE WHEN t.type = 'sell' THEN t.amount ELSE 0 END)
) > 0
ON CONFLICT (user_id, asset) DO UPDATE
SET quantity = EXCLUDED.quantity,
    updated_at = now();
