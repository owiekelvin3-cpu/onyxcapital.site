-- Mining contracts: term tracking, daily accrual sync, and institutional signal desk

ALTER TABLE public.mining_packages
  ADD COLUMN IF NOT EXISTS package_id text,
  ADD COLUMN IF NOT EXISTS hashrate text,
  ADD COLUMN IF NOT EXISTS term_days integer,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS accrued_profit numeric(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_accrual_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.signal_packages
  ADD COLUMN IF NOT EXISTS package_id text;

CREATE TABLE IF NOT EXISTS public.trading_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('buy', 'sell')),
  entry_price text NOT NULL,
  target_price text NOT NULL,
  stop_price text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled')),
  min_tier text NOT NULL DEFAULT 'basic' CHECK (min_tier IN ('basic', 'pro', 'vip')),
  confidence integer NOT NULL DEFAULT 70 CHECK (confidence >= 0 AND confidence <= 100),
  outcome text,
  notes text,
  published_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trading_signals_status_idx ON public.trading_signals (status, published_at DESC);
CREATE INDEX IF NOT EXISTS mining_packages_user_active_idx ON public.mining_packages (user_id, status, expires_at);

ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.signal_tier_rank(p_tier text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(COALESCE(p_tier, 'basic'))
    WHEN 'vip' THEN 3
    WHEN 'pro' THEN 2
    ELSE 1
  END;
$$;

CREATE OR REPLACE FUNCTION public.user_signal_tier_rank(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(public.signal_tier_rank(sp.package_id)), 0)
  FROM public.signal_packages sp
  WHERE sp.user_id = p_user_id
    AND sp.status = 'active'
    AND (sp.expires_at IS NULL OR sp.expires_at > now());
$$;

DROP POLICY IF EXISTS "Subscribers read trading signals" ON public.trading_signals;
CREATE POLICY "Subscribers read trading signals" ON public.trading_signals
  FOR SELECT
  USING (
    public.is_admin()
    OR public.signal_tier_rank(min_tier) <= public.user_signal_tier_rank(auth.uid())
  );

DROP POLICY IF EXISTS "Admins manage trading signals" ON public.trading_signals;
CREATE POLICY "Admins manage trading signals" ON public.trading_signals
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.mining_package_before_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.term_days IS NOT NULL AND NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + make_interval(days => NEW.term_days);
  END IF;
  IF NEW.last_accrual_at IS NULL THEN
    NEW.last_accrual_at := now();
  END IF;
  IF NEW.accrued_profit IS NULL THEN
    NEW.accrued_profit := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mining_defaults ON public.mining_packages;
CREATE TRIGGER trg_mining_defaults
  BEFORE INSERT ON public.mining_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.mining_package_before_insert();

CREATE OR REPLACE FUNCTION public.sync_mining_accruals(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(p_user_id, auth.uid());
  v_rec public.mining_packages%ROWTYPE;
  v_end timestamptz;
  v_elapsed_days numeric;
  v_delta numeric;
  v_total numeric := 0;
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_uid <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  FOR v_rec IN
    SELECT *
    FROM public.mining_packages
    WHERE user_id = v_uid
      AND status = 'active'
    FOR UPDATE
  LOOP
    IF v_rec.expires_at IS NOT NULL AND v_rec.expires_at <= now() THEN
      UPDATE public.mining_packages
      SET status = 'completed', last_accrual_at = now()
      WHERE id = v_rec.id;
      CONTINUE;
    END IF;

    v_end := LEAST(now(), COALESCE(v_rec.expires_at, now()));
    v_elapsed_days := EXTRACT(EPOCH FROM (v_end - COALESCE(v_rec.last_accrual_at, v_rec.created_at))) / 86400.0;

    IF v_elapsed_days > 0 THEN
      v_delta := round(v_rec.investment * (v_rec.daily_return / 100.0) * v_elapsed_days, 2);
      IF v_delta > 0 THEN
        UPDATE public.mining_packages
        SET
          accrued_profit = accrued_profit + v_delta,
          last_accrual_at = v_end
        WHERE id = v_rec.id;

        UPDATE public.balances
        SET amount = amount + v_delta, updated_at = now()
        WHERE user_id = v_uid;

        IF NOT FOUND THEN
          INSERT INTO public.balances (user_id, currency, amount)
          VALUES (v_uid, 'USD', v_delta);
        END IF;

        v_total := v_total + v_delta;
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'credited', v_total, 'contracts', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_mining_accruals(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_mining_accruals(uuid) TO authenticated;

-- Seed desk signals when table is empty
INSERT INTO public.trading_signals (symbol, direction, entry_price, target_price, stop_price, status, min_tier, confidence, notes, published_at)
SELECT * FROM (VALUES
  ('EUR/USD', 'buy', '1.0840', '1.0920', '1.0790', 'active', 'basic', 74, 'Trend continuation above London session support.', now() - interval '3 hours'),
  ('GBP/USD', 'sell', '1.2745', '1.2680', '1.2790', 'active', 'basic', 71, 'Rejection at weekly pivot — risk defined below stop cluster.', now() - interval '5 hours'),
  ('XAU/USD', 'buy', '2415.00', '2450.00', '2395.00', 'active', 'pro', 78, 'Institutional flow bid into NY open; target prior swing high.', now() - interval '1 hour'),
  ('BTC/USD', 'buy', '68200', '70000', '66800', 'closed', 'pro', 69, 'Momentum breakout — closed at target.', now() - interval '2 days'),
  ('NDX', 'buy', '20120', '20580', '19840', 'active', 'vip', 82, 'Index mean-reversion complete; VIP desk size suggestion only.', now() - interval '45 minutes'),
  ('ETH/USD', 'sell', '3620', '3480', '3710', 'active', 'pro', 73, 'Lower-high structure on 4H; fade into resistance band.', now() - interval '6 hours'),
  ('USD/JPY', 'buy', '149.80', '150.45', '149.35', 'active', 'basic', 68, 'Carry bias intact while above 149.50 handle.', now() - interval '8 hours'),
  ('SOL/USD', 'buy', '142.50', '151.00', '137.20', 'active', 'vip', 76, 'Relative strength vs BTC; VIP desk high-conviction setup.', now() - interval '30 minutes')
) AS v(symbol, direction, entry_price, target_price, stop_price, status, min_tier, confidence, notes, published_at)
WHERE NOT EXISTS (SELECT 1 FROM public.trading_signals LIMIT 1);
