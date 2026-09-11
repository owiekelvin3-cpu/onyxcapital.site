-- Run this in the Onyx Capital Supabase SQL editor (project fioiyojnhiivbegkqjiq).
-- Deposit balance = approved user deposits + admin Add/Remove funds - live buy spend.
-- Profit, portfolio cash, referrals, and sale proceeds do not increase Deposit balance.

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
  v_buy_spend numeric(18, 2);
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

  SELECT COALESCE(SUM(round(t.amount * t.price, 2)), 0) INTO v_buy_spend
  FROM public.trades t
  WHERE t.user_id = p_user_id
    AND t.type = 'buy'
    AND COALESCE(t.status, 'completed') NOT IN ('rejected', 'cancelled');

  v_principal := round(v_deposits + v_credits - v_buy_spend, 2);

  RETURN GREATEST(0, LEAST(v_cash, v_principal));
END;
$$;

REVOKE ALL ON FUNCTION public.user_deposit_balance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_deposit_balance(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
