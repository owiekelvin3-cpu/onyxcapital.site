-- Meme coin wallet: separate holdings + instant buy/sell settlement

CREATE TABLE IF NOT EXISTS public.meme_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meme_coin_id uuid NOT NULL REFERENCES public.daily_meme_coins(id) ON DELETE RESTRICT,
  quantity numeric(24, 12) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  avg_cost_usd numeric(18, 6),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, meme_coin_id)
);

CREATE INDEX IF NOT EXISTS meme_holdings_user_id_idx ON public.meme_holdings (user_id);

CREATE TABLE IF NOT EXISTS public.meme_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meme_coin_id uuid NOT NULL REFERENCES public.daily_meme_coins(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('buy', 'sell')),
  quantity numeric(24, 12) NOT NULL CHECK (quantity > 0),
  price_usd numeric(18, 8) NOT NULL CHECK (price_usd > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meme_trades_user_id_idx ON public.meme_trades (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS meme_trades_coin_idx ON public.meme_trades (meme_coin_id, created_at DESC);

ALTER TABLE public.meme_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meme_trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own meme holdings" ON public.meme_holdings;
CREATE POLICY "Users view own meme holdings" ON public.meme_holdings
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage meme holdings" ON public.meme_holdings;
CREATE POLICY "Admins manage meme holdings" ON public.meme_holdings
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users view own meme trades" ON public.meme_trades;
CREATE POLICY "Users view own meme trades" ON public.meme_trades
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users insert own meme trades" ON public.meme_trades;
CREATE POLICY "Users insert own meme trades" ON public.meme_trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage meme trades" ON public.meme_trades;
CREATE POLICY "Admins manage meme trades" ON public.meme_trades
  FOR ALL USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.settle_meme_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trade_total numeric(18, 2);
  current_amount numeric(18, 2);
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
    SELECT amount INTO current_amount
    FROM public.balances
    WHERE user_id = NEW.user_id
    FOR UPDATE;

    IF current_amount IS NULL OR current_amount < trade_total THEN
      RAISE EXCEPTION 'Insufficient balance for meme trade';
    END IF;

    UPDATE public.balances
    SET amount = amount - trade_total,
        updated_at = now()
    WHERE user_id = NEW.user_id;

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
    WHERE user_id = NEW.user_id
      AND meme_coin_id = NEW.meme_coin_id
      AND quantity <= 0;

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

DROP TRIGGER IF EXISTS trg_meme_trade_settle ON public.meme_trades;
CREATE TRIGGER trg_meme_trade_settle
  BEFORE INSERT ON public.meme_trades
  FOR EACH ROW
  EXECUTE FUNCTION public.settle_meme_trade();
