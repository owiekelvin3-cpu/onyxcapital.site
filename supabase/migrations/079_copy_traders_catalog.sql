-- Admin-managed copy trader catalog with required prices.
-- Users pay the catalog price (never a client-supplied amount) when they copy or recopy.

CREATE TABLE IF NOT EXISTS public.copy_traders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  handle text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  roi numeric(8, 2) NOT NULL DEFAULT 0,
  followers integer NOT NULL DEFAULT 0 CHECK (followers >= 0),
  win_rate numeric(5, 2) NOT NULL DEFAULT 0 CHECK (win_rate >= 0 AND win_rate <= 100),
  rating numeric(3, 2) NOT NULL DEFAULT 4.5 CHECK (rating >= 0 AND rating <= 5),
  avatar_kind text NOT NULL DEFAULT 'illustrated'
    CHECK (avatar_kind IN ('anime', 'illustrated', 'gradient', 'pixel', 'emoji')),
  avatar_seed text NOT NULL DEFAULT 'trader',
  ring_color text NOT NULL DEFAULT '#6366f1',
  verified boolean NOT NULL DEFAULT false,
  badge text,
  section_id text NOT NULL DEFAULT 'featured',
  sort_order integer NOT NULL DEFAULT 0,
  price numeric(18, 2) NOT NULL CHECK (price > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT copy_traders_name_key UNIQUE (name),
  CONSTRAINT copy_traders_name_len CHECK (char_length(trim(name)) >= 2)
);

CREATE INDEX IF NOT EXISTS copy_traders_section_active_idx
  ON public.copy_traders (section_id, is_active, sort_order);

ALTER TABLE public.copy_traders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view active copy traders" ON public.copy_traders;
CREATE POLICY "Authenticated can view active copy traders" ON public.copy_traders
  FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage copy traders" ON public.copy_traders;
CREATE POLICY "Admins can manage copy traders" ON public.copy_traders
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.copy_traders TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_copy_traders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_copy_traders_updated_at ON public.copy_traders;
CREATE TRIGGER trg_copy_traders_updated_at
  BEFORE UPDATE ON public.copy_traders
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_copy_traders_updated_at();

INSERT INTO public.copy_traders (
  name, handle, bio, roi, followers, win_rate, rating,
  avatar_kind, avatar_seed, ring_color, verified, badge,
  section_id, sort_order, price, is_active
)
SELECT
  x.name,
  x.handle,
  x.bio,
  x.roi,
  x.followers,
  x.win_rate,
  x.rating,
  x.avatar_kind,
  x.avatar_seed,
  x.ring_color,
  x.verified,
  x.badge,
  x.section_id,
  x.sort_order,
  x.price,
  x.is_active
FROM jsonb_to_recordset('[{"name":"AlphaTrader","handle":"@alpha.fx","bio":"Momentum scalper · BTC & ETH focus","roi":142.5,"followers":2840,"win_rate":78,"rating":4.9,"avatar_kind":"illustrated","avatar_seed":"alpha-trader","ring_color":"#3b82f6","verified":true,"badge":"Pro","section_id":"featured","sort_order":10,"price":199,"is_active":true},{"name":"CryptoKing","handle":"@cryptoking","bio":"Altcoin swing setups · high conviction","roi":98.3,"followers":5620,"win_rate":72,"rating":4.8,"avatar_kind":"anime","avatar_seed":"crypto-king","ring_color":"#f97316","verified":true,"badge":null,"section_id":"featured","sort_order":20,"price":149,"is_active":true},{"name":"YukiTrade","handle":"@yuki.trades","bio":"Tokyo session · JPY pairs & SOL","roi":118.2,"followers":3910,"win_rate":74,"rating":4.9,"avatar_kind":"anime","avatar_seed":"yuki-trade","ring_color":"#ec4899","verified":true,"badge":"VIP","section_id":"featured","sort_order":30,"price":199,"is_active":true},{"name":"QuantMaster","handle":"@quant.master","bio":"Systematic models · risk-first","roi":67.1,"followers":1890,"win_rate":81,"rating":4.7,"avatar_kind":"illustrated","avatar_seed":"quant-master","ring_color":"#6366f1","verified":false,"badge":null,"section_id":"featured","sort_order":40,"price":99,"is_active":true},{"name":"SwingPro","handle":"@swingpro","bio":"Multi-day holds · FX majors","roi":54.8,"followers":3210,"win_rate":69,"rating":4.6,"avatar_kind":"gradient","avatar_seed":"swing-pro","ring_color":"#14b8a6","verified":false,"badge":null,"section_id":"featured","sort_order":50,"price":99,"is_active":true},{"name":"DeFiWhale","handle":"@defi.whale","bio":"On-chain flows · L2 narratives","roi":203.2,"followers":8900,"win_rate":65,"rating":4.9,"avatar_kind":"pixel","avatar_seed":"defi-whale","ring_color":"#8b5cf6","verified":true,"badge":"Whale","section_id":"featured","sort_order":60,"price":399,"is_active":true},{"name":"SteadyGains","handle":"@steady.gains","bio":"Low drawdown · compounding daily","roi":38.4,"followers":1450,"win_rate":85,"rating":4.5,"avatar_kind":"gradient","avatar_seed":"steady-gains","ring_color":"#22c55e","verified":false,"badge":null,"section_id":"featured","sort_order":70,"price":49,"is_active":true},{"name":"NovaPulse","handle":"@nova.pulse","bio":"Breakout hunter · indices & gold","roi":89.6,"followers":4720,"win_rate":71,"rating":4.8,"avatar_kind":"emoji","avatar_seed":"nova-pulse","ring_color":"#eab308","verified":false,"badge":null,"section_id":"featured","sort_order":80,"price":149,"is_active":true},{"name":"MoonRunner","handle":"@moon.runner","bio":"Anime chart reader · meme + majors","roi":156.8,"followers":6240,"win_rate":68,"rating":4.8,"avatar_kind":"anime","avatar_seed":"moon-runner","ring_color":"#a855f7","verified":true,"badge":null,"section_id":"featured","sort_order":90,"price":299,"is_active":true},{"name":"ZenScalp","handle":"@zen.scalp","bio":"1m–5m precision · tight stops","roi":76.3,"followers":2580,"win_rate":79,"rating":4.7,"avatar_kind":"illustrated","avatar_seed":"zen-scalp","ring_color":"#06b6d4","verified":false,"badge":null,"section_id":"featured","sort_order":100,"price":149,"is_active":true},{"name":"GridLord","handle":"@grid.lord","bio":"Range bots · sideways markets","roi":44.2,"followers":1120,"win_rate":83,"rating":4.4,"avatar_kind":"pixel","avatar_seed":"grid-lord","ring_color":"#64748b","verified":false,"badge":null,"section_id":"featured","sort_order":110,"price":49,"is_active":true},{"name":"WolfStreet","handle":"@wolf.street","bio":"US open volatility · SPX & NAS","roi":91.4,"followers":5100,"win_rate":70,"rating":4.7,"avatar_kind":"gradient","avatar_seed":"wolf-street","ring_color":"#ef4444","verified":false,"badge":"Hot","section_id":"featured","sort_order":120,"price":149,"is_active":true},{"name":"ChainHawk","handle":"@chain.hawk","bio":"Layer-1 rotations · on-chain alpha","roi":167.4,"followers":7120,"win_rate":66,"rating":4.8,"avatar_kind":"anime","avatar_seed":"chain-hawk","ring_color":"#f59e0b","verified":true,"badge":"Hot","section_id":"crypto","sort_order":10,"price":299,"is_active":true},{"name":"SolStorm","handle":"@sol.storm","bio":"SOL ecosystem · meme + DeFi pairs","roi":134.9,"followers":5890,"win_rate":70,"rating":4.7,"avatar_kind":"pixel","avatar_seed":"sol-storm","ring_color":"#14b8a6","verified":true,"badge":null,"section_id":"crypto","sort_order":20,"price":199,"is_active":true},{"name":"LayerKing","handle":"@layer.king","bio":"L2 narratives · rollup plays","roi":112.3,"followers":4210,"win_rate":73,"rating":4.8,"avatar_kind":"illustrated","avatar_seed":"layer-king","ring_color":"#6366f1","verified":false,"badge":null,"section_id":"crypto","sort_order":30,"price":199,"is_active":true},{"name":"MemeLord","handle":"@meme.lord","bio":"High vol memes · strict risk caps","roi":221.6,"followers":9340,"win_rate":58,"rating":4.6,"avatar_kind":"emoji","avatar_seed":"meme-lord","ring_color":"#a855f7","verified":false,"badge":"Wild","section_id":"crypto","sort_order":40,"price":399,"is_active":true},{"name":"ETHOracle","handle":"@eth.oracle","bio":"ETH/BTC ratio · macro cycles","roi":88.7,"followers":3650,"win_rate":76,"rating":4.9,"avatar_kind":"gradient","avatar_seed":"eth-oracle","ring_color":"#3b82f6","verified":true,"badge":null,"section_id":"crypto","sort_order":50,"price":149,"is_active":true},{"name":"BaseRider","handle":"@base.rider","bio":"Base chain gems · early entries","roi":145.2,"followers":2780,"win_rate":64,"rating":4.7,"avatar_kind":"anime","avatar_seed":"base-rider","ring_color":"#2563eb","verified":false,"badge":null,"section_id":"crypto","sort_order":60,"price":199,"is_active":true},{"name":"PipHunter","handle":"@pip.hunter","bio":"EUR/USD specialist · London open","roi":62.4,"followers":3340,"win_rate":77,"rating":4.8,"avatar_kind":"illustrated","avatar_seed":"pip-hunter","ring_color":"#0ea5e9","verified":true,"badge":null,"section_id":"forex","sort_order":10,"price":99,"is_active":true},{"name":"EuroFlow","handle":"@euro.flow","bio":"Euro crosses · ECB week focus","roi":51.8,"followers":2890,"win_rate":74,"rating":4.6,"avatar_kind":"gradient","avatar_seed":"euro-flow","ring_color":"#0284c7","verified":false,"badge":null,"section_id":"forex","sort_order":20,"price":99,"is_active":true},{"name":"GBPulse","handle":"@gb.pulse","bio":"Cable · BOE volatility setups","roi":73.1,"followers":4120,"win_rate":71,"rating":4.7,"avatar_kind":"anime","avatar_seed":"gb-pulse","ring_color":"#dc2626","verified":true,"badge":null,"section_id":"forex","sort_order":30,"price":99,"is_active":true},{"name":"YenSamurai","handle":"@yen.samurai","bio":"USD/JPY · Tokyo + NY overlap","roi":84.5,"followers":3560,"win_rate":69,"rating":4.8,"avatar_kind":"pixel","avatar_seed":"yen-samurai","ring_color":"#ef4444","verified":false,"badge":"Pro","section_id":"forex","sort_order":40,"price":149,"is_active":true},{"name":"FrancTrader","handle":"@franc.trader","bio":"CHF safe-haven · risk-off plays","roi":39.6,"followers":1980,"win_rate":82,"rating":4.5,"avatar_kind":"gradient","avatar_seed":"franc-trader","ring_color":"#64748b","verified":false,"badge":null,"section_id":"forex","sort_order":50,"price":49,"is_active":true},{"name":"CableKing","handle":"@cable.king","bio":"GBP majors · news-driven entries","roi":96.2,"followers":4670,"win_rate":68,"rating":4.7,"avatar_kind":"illustrated","avatar_seed":"cable-king","ring_color":"#b91c1c","verified":true,"badge":null,"section_id":"forex","sort_order":60,"price":149,"is_active":true},{"name":"GoldRush","handle":"@gold.rush","bio":"XAU/USD · inflation hedges","roi":58.3,"followers":5230,"win_rate":75,"rating":4.8,"avatar_kind":"gradient","avatar_seed":"gold-rush","ring_color":"#eab308","verified":true,"badge":"Pro","section_id":"indices","sort_order":10,"price":99,"is_active":true},{"name":"OilBaron","handle":"@oil.baron","bio":"WTI & Brent · supply shocks","roi":71.9,"followers":3890,"win_rate":67,"rating":4.6,"avatar_kind":"pixel","avatar_seed":"oil-baron","ring_color":"#78350f","verified":false,"badge":null,"section_id":"indices","sort_order":20,"price":99,"is_active":true},{"name":"SPXPilot","handle":"@spx.pilot","bio":"S&P 500 · trend following","roi":45.7,"followers":6120,"win_rate":78,"rating":4.7,"avatar_kind":"illustrated","avatar_seed":"spx-pilot","ring_color":"#16a34a","verified":true,"badge":null,"section_id":"indices","sort_order":30,"price":49,"is_active":true},{"name":"NasdaqNinja","handle":"@nasdaq.ninja","bio":"Tech-heavy · earnings season","roi":93.4,"followers":4450,"win_rate":66,"rating":4.8,"avatar_kind":"anime","avatar_seed":"nasdaq-ninja","ring_color":"#7c3aed","verified":false,"badge":"Hot","section_id":"indices","sort_order":40,"price":149,"is_active":true},{"name":"DAXPro","handle":"@dax.pro","bio":"German index · EU session","roi":52.1,"followers":2340,"win_rate":73,"rating":4.5,"avatar_kind":"emoji","avatar_seed":"dax-pro","ring_color":"#1d4ed8","verified":false,"badge":null,"section_id":"indices","sort_order":50,"price":99,"is_active":true},{"name":"SilverFox","handle":"@silver.fox","bio":"Silver & metals · ratio trades","roi":64.8,"followers":1870,"win_rate":71,"rating":4.6,"avatar_kind":"gradient","avatar_seed":"silver-fox","ring_color":"#94a3b8","verified":false,"badge":null,"section_id":"indices","sort_order":60,"price":99,"is_active":true},{"name":"FlashTrade","handle":"@flash.trade","bio":"Sub-minute entries · tight RR","roi":82.6,"followers":2980,"win_rate":81,"rating":4.7,"avatar_kind":"pixel","avatar_seed":"flash-trade","ring_color":"#06b6d4","verified":true,"badge":null,"section_id":"scalping","sort_order":10,"price":149,"is_active":true},{"name":"MicroEdge","handle":"@micro.edge","bio":"Tick charts · liquidity grabs","roi":69.3,"followers":2140,"win_rate":84,"rating":4.6,"avatar_kind":"anime","avatar_seed":"micro-edge","ring_color":"#0891b2","verified":false,"badge":null,"section_id":"scalping","sort_order":20,"price":99,"is_active":true},{"name":"TickMaster","handle":"@tick.master","bio":"DOM reading · futures scalps","roi":77.5,"followers":3670,"win_rate":79,"rating":4.8,"avatar_kind":"illustrated","avatar_seed":"tick-master","ring_color":"#0d9488","verified":true,"badge":"Pro","section_id":"scalping","sort_order":30,"price":149,"is_active":true},{"name":"FastFinger","handle":"@fast.finger","bio":"US open only · 15–30 pip targets","roi":91.2,"followers":4890,"win_rate":76,"rating":4.7,"avatar_kind":"emoji","avatar_seed":"fast-finger","ring_color":"#f97316","verified":false,"badge":null,"section_id":"scalping","sort_order":40,"price":149,"is_active":true},{"name":"BlitzScalp","handle":"@blitz.scalp","bio":"BTC perp · 1m structure","roi":108.4,"followers":5520,"win_rate":72,"rating":4.8,"avatar_kind":"gradient","avatar_seed":"blitz-scalp","ring_color":"#ea580c","verified":false,"badge":"Hot","section_id":"scalping","sort_order":50,"price":199,"is_active":true},{"name":"RapidFire","handle":"@rapid.fire","bio":"Multi-pair scalper · Asian session","roi":63.7,"followers":1760,"win_rate":80,"rating":4.5,"avatar_kind":"pixel","avatar_seed":"rapid-fire","ring_color":"#14b8a6","verified":false,"badge":null,"section_id":"scalping","sort_order":60,"price":99,"is_active":true},{"name":"NeonTrader","handle":"@neon.trader","bio":"New verified · altcoin breakouts","roi":178.9,"followers":1240,"win_rate":62,"rating":4.9,"avatar_kind":"anime","avatar_seed":"neon-trader","ring_color":"#d946ef","verified":true,"badge":"New","section_id":"rising","sort_order":10,"price":299,"is_active":true},{"name":"PixelProfit","handle":"@pixel.profit","bio":"Rising ROI · gaming token plays","roi":192.3,"followers":980,"win_rate":59,"rating":4.7,"avatar_kind":"pixel","avatar_seed":"pixel-profit","ring_color":"#8b5cf6","verified":false,"badge":"New","section_id":"rising","sort_order":20,"price":299,"is_active":true},{"name":"ApexRise","handle":"@apex.rise","bio":"Fast follower growth · swing crypto","roi":124.6,"followers":1560,"win_rate":71,"rating":4.8,"avatar_kind":"illustrated","avatar_seed":"apex-rise","ring_color":"#6366f1","verified":true,"badge":"Rising","section_id":"rising","sort_order":30,"price":199,"is_active":true},{"name":"VoltTrade","handle":"@volt.trade","bio":"High energy setups · volatile hours","roi":156.1,"followers":890,"win_rate":64,"rating":4.6,"avatar_kind":"emoji","avatar_seed":"volt-trade","ring_color":"#eab308","verified":false,"badge":"New","section_id":"rising","sort_order":40,"price":299,"is_active":true},{"name":"StarPath","handle":"@star.path","bio":"Consistent monthly gains · low DD","roi":87.4,"followers":2100,"win_rate":77,"rating":4.9,"avatar_kind":"gradient","avatar_seed":"star-path","ring_color":"#22c55e","verified":true,"badge":"Rising","section_id":"rising","sort_order":50,"price":149,"is_active":true},{"name":"ByteGain","handle":"@byte.gain","bio":"AI token baskets · thematic trades","roi":143.8,"followers":1340,"win_rate":68,"rating":4.7,"avatar_kind":"anime","avatar_seed":"byte-gain","ring_color":"#3b82f6","verified":false,"badge":"New","section_id":"rising","sort_order":60,"price":199,"is_active":true}]'::jsonb) AS x(
  name text,
  handle text,
  bio text,
  roi numeric,
  followers integer,
  win_rate numeric,
  rating numeric,
  avatar_kind text,
  avatar_seed text,
  ring_color text,
  verified boolean,
  badge text,
  section_id text,
  sort_order integer,
  price numeric,
  is_active boolean
)
ON CONFLICT (name) DO NOTHING;

-- Charge the catalog price on first copy and on recopy (cancelled -> active).
CREATE OR REPLACE FUNCTION public.debit_copy_trading_from_catalog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price numeric(18, 2);
  v_active boolean;
  v_current numeric;
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

  INSERT INTO public.balances (user_id, currency, amount)
  VALUES (NEW.user_id, 'USD', 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT amount INTO v_current
  FROM public.balances
  WHERE user_id = NEW.user_id
  FOR UPDATE;

  IF v_current IS NULL OR v_current < v_price THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.balances
  SET amount = amount - v_price,
      updated_at = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_copy_trading_debit ON public.copy_trading_subscriptions;
CREATE TRIGGER trg_copy_trading_debit
  BEFORE INSERT OR UPDATE OF status ON public.copy_trading_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.debit_copy_trading_from_catalog();
