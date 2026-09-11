-- Run this in the Onyx Capital Supabase SQL editor (project fioiyojnhiivbegkqjiq).
-- Makes user Overview Deposit balance use the same ledger as Admin → Users.
-- user_deposit_credits / user_deposit_balance / user_deposit_spend run as SECURITY DEFINER
-- so the logged-in user sees admin Add/Remove funds even if table RLS is incomplete.

CREATE TABLE IF NOT EXISTS public.user_deposit_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(18, 2) NOT NULL CHECK (amount <> 0),
  note text,
  balance_before numeric(18, 2) NOT NULL,
  balance_after numeric(18, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_deposit_adjustments_user_id_idx
  ON public.user_deposit_adjustments (user_id, created_at DESC);

ALTER TABLE public.user_deposit_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own deposit adjustments" ON public.user_deposit_adjustments;
CREATE POLICY "Users can view own deposit adjustments" ON public.user_deposit_adjustments
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage deposit adjustments" ON public.user_deposit_adjustments;
CREATE POLICY "Admins can manage deposit adjustments" ON public.user_deposit_adjustments
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT ON public.user_deposit_adjustments TO authenticated;

DROP POLICY IF EXISTS "Users can view own deposit cash adjustments" ON public.admin_balance_adjustments;
CREATE POLICY "Users can view own deposit cash adjustments" ON public.admin_balance_adjustments
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND reason ILIKE 'Deposit balance%'
  );

CREATE OR REPLACE FUNCTION public.user_can_read_wallet(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;
  RETURN auth.uid() IS NOT DISTINCT FROM p_user_id OR public.is_admin();
END;
$$;

CREATE OR REPLACE FUNCTION public.user_deposit_credits(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ledger numeric(18, 2);
  v_tagged numeric(18, 2);
BEGIN
  IF NOT public.user_can_read_wallet(p_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(SUM(a.amount), 0) INTO v_ledger
  FROM public.user_deposit_adjustments a
  WHERE a.user_id = p_user_id;

  IF EXISTS (SELECT 1 FROM public.user_deposit_adjustments a WHERE a.user_id = p_user_id) THEN
    RETURN round(v_ledger, 2);
  END IF;

  SELECT COALESCE(SUM(
    CASE WHEN lower(b.direction) = 'debit' THEN -b.amount ELSE b.amount END
  ), 0) INTO v_tagged
  FROM public.admin_balance_adjustments b
  WHERE b.user_id = p_user_id
    AND b.reason ILIKE 'Deposit balance%';

  RETURN round(COALESCE(v_tagged, 0), 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.user_deposit_spend(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
  IF NOT public.user_can_read_wallet(p_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cash numeric(18, 2);
  v_deposits numeric(18, 2);
  v_credits numeric(18, 2);
  v_spend numeric(18, 2);
  v_principal numeric(18, 2);
BEGIN
  IF NOT public.user_can_read_wallet(p_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

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

GRANT SELECT ON public.admin_balance_adjustments TO authenticated;

REVOKE ALL ON FUNCTION public.user_can_read_wallet(uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.user_deposit_credits(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_deposit_credits(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.user_deposit_spend(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_deposit_spend(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.user_deposit_balance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_deposit_balance(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
