-- Daily meme coin discovery (trending imports + ONYX-generated + admin manual)

CREATE TABLE IF NOT EXISTS public.daily_meme_coins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_date date NOT NULL DEFAULT (timezone('utc', now()))::date,
  symbol text NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  source text NOT NULL CHECK (source IN ('trending', 'onyx_generated', 'admin_manual')),
  coingecko_id text,
  price_usd numeric(24, 12),
  change_24h numeric(10, 4),
  market_cap_usd numeric(24, 2),
  image_url text,
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_date, slug)
);

CREATE INDEX IF NOT EXISTS daily_meme_coins_list_date_idx
  ON public.daily_meme_coins (list_date DESC, sort_order ASC);

CREATE INDEX IF NOT EXISTS daily_meme_coins_source_idx
  ON public.daily_meme_coins (source, list_date DESC);

ALTER TABLE public.daily_meme_coins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active meme coins" ON public.daily_meme_coins;
CREATE POLICY "Public read active meme coins" ON public.daily_meme_coins
  FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Admins manage meme coins" ON public.daily_meme_coins;
CREATE POLICY "Admins manage meme coins" ON public.daily_meme_coins
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.touch_daily_meme_coin_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS daily_meme_coins_updated_at ON public.daily_meme_coins;
CREATE TRIGGER daily_meme_coins_updated_at
  BEFORE UPDATE ON public.daily_meme_coins
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_daily_meme_coin_updated_at();
