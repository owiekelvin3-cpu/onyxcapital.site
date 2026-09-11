-- One wallet split for admin and the user dashboard.
-- Deposit = approved user deposits + admin Add/Remove funds, capped by cash.
-- Profit is remaining cash, never more than lifetime profit. Admin deposit credits cannot land in Profit Total.

CREATE OR REPLACE FUNCTION public.user_can_read_wallet(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN true;
  END IF;
  IF auth.uid() IS NULL AND current_user IN ('postgres', 'supabase_admin') THEN
    RETURN true;
  END IF;
  RETURN auth.uid() IS NOT DISTINCT FROM p_user_id OR public.is_admin();
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

  -- Cash already reflects spending. Do not subtract lifetime buys/AI/signals again —
  -- that made admin Add funds disappear into Profit Total.
  RETURN GREATEST(0, LEAST(v_cash, round(v_deposits + v_credits, 2)));
END;
$$;

CREATE OR REPLACE FUNCTION public.user_wallet_split(p_user_id uuid)
RETURNS jsonb
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
  v_lifetime numeric(18, 2);
  v_deposit numeric(18, 2);
  v_profit numeric(18, 2);
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
  v_lifetime := round((
    COALESCE((SELECT SUM(t.profit) FROM public.trades t WHERE t.user_id = p_user_id), 0)
    + COALESCE((SELECT SUM(a.amount) FROM public.user_profit_adjustments a WHERE a.user_id = p_user_id), 0)
    + COALESCE((SELECT SUM(c.amount) FROM public.copy_trading_profit_credits c WHERE c.user_id = p_user_id), 0)
    + COALESCE((SELECT SUM(r.amount) FROM public.referral_rewards r WHERE r.referrer_id = p_user_id), 0)
  )::numeric, 2);

  v_deposit := GREATEST(0, LEAST(v_cash, round(v_deposits + v_credits, 2)));

  IF v_cash <= 0 THEN
    v_profit := 0;
  ELSIF v_lifetime <= 0 THEN
    v_profit := v_lifetime;
  ELSE
    v_profit := LEAST(v_lifetime, GREATEST(0, round(v_cash - v_deposit, 2)));
  END IF;

  RETURN jsonb_build_object(
    'cash', v_cash,
    'deposit', v_deposit,
    'profit', v_profit,
    'credits', v_credits,
    'userDeposits', v_deposits,
    'buySpend', v_spend
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_from_deposit(
  p_user_id uuid,
  p_amount numeric,
  p_error text DEFAULT 'Insufficient deposit balance. Profit can only be withdrawn.'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cash numeric(18, 2);
  v_deposit numeric(18, 2);
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.balances (user_id, currency, amount)
  VALUES (p_user_id, 'USD', 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT amount INTO v_cash
  FROM public.balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_deposit := public.user_deposit_balance(p_user_id);

  IF v_cash IS NULL OR v_deposit < p_amount OR v_cash < p_amount THEN
    RAISE EXCEPTION '%', p_error;
  END IF;

  UPDATE public.balances
  SET amount = amount - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.user_deposit_adjustments (
    user_id, admin_id, amount, note, balance_before, balance_after
  )
  VALUES (
    p_user_id,
    p_user_id,
    -round(p_amount, 2),
    'Deposit spend',
    v_cash,
    round(v_cash - p_amount, 2)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.user_can_read_wallet(uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.user_deposit_balance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_deposit_balance(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.user_wallet_split(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_wallet_split(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.debit_from_deposit(uuid, numeric, text) FROM PUBLIC;

NOTIFY pgrst, 'reload schema';
