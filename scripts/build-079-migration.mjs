import { writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { seedRows } from "./copy-trader-seed-data.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, "../supabase/migrations/079_copy_traders_catalog.sql");
const json = JSON.stringify(seedRows()).replace(/'/g, "''");

const sql = `-- Admin-managed copy trader catalog with required prices.
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
FROM jsonb_to_recordset('${json}'::jsonb) AS x(
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
`;

writeFileSync(out, sql);
console.log(`Wrote ${out} (${seedRows().length} traders)`);
