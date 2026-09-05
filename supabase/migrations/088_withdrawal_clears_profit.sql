-- Completing a withdrawal removes that cash from Profit Total so an empty wallet cannot keep a leftover profit figure.

CREATE OR REPLACE FUNCTION public.user_lifetime_profit(p_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT round((
    COALESCE((SELECT SUM(t.profit) FROM public.trades t WHERE t.user_id = p_user_id), 0)
    + COALESCE((SELECT SUM(a.amount) FROM public.user_profit_adjustments a WHERE a.user_id = p_user_id), 0)
    + COALESCE((
        SELECT SUM(c.amount) FROM public.copy_trading_profit_credits c WHERE c.user_id = p_user_id
      ), 0)
    + COALESCE((
        SELECT SUM(r.amount) FROM public.referral_rewards r WHERE r.referrer_id = p_user_id
      ), 0)
  )::numeric, 2);
$$;

CREATE OR REPLACE FUNCTION public.apply_withdrawal_profit_clawback(p_withdrawal_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.withdrawals%ROWTYPE;
  lifetime numeric(18, 2);
  claw numeric(18, 2);
  v_admin uuid;
  v_balance numeric(18, 2);
BEGIN
  SELECT * INTO rec
  FROM public.withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF rec.id IS NULL OR rec.status IS DISTINCT FROM 'completed' THEN
    RETURN 0;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_profit_adjustments a
    WHERE a.user_id = rec.user_id
      AND a.note = 'Withdrawal completed — profit withdrawn:' || rec.id::text
  ) THEN
    RETURN 0;
  END IF;

  lifetime := public.user_lifetime_profit(rec.user_id);
  claw := LEAST(GREATEST(lifetime, 0), round(GREATEST(COALESCE(rec.amount, 0), 0), 2));
  IF claw <= 0 THEN
    RETURN 0;
  END IF;

  v_admin := COALESCE(
    auth.uid(),
    (SELECT id FROM public.profiles WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1)
  );
  IF v_admin IS NULL THEN
    v_admin := rec.user_id;
  END IF;

  SELECT amount INTO v_balance
  FROM public.balances
  WHERE user_id = rec.user_id
  FOR UPDATE;
  v_balance := COALESCE(v_balance, 0);

  INSERT INTO public.user_profit_adjustments (
    user_id, admin_id, amount, note, balance_before, balance_after
  )
  VALUES (
    rec.user_id,
    v_admin,
    -claw,
    'Withdrawal completed — profit withdrawn:' || rec.id::text,
    v_balance,
    v_balance
  );

  RETURN claw;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_withdrawal_profit_clawback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD.status IS DISTINCT FROM 'completed'
    AND NEW.status = 'completed' THEN
    PERFORM public.apply_withdrawal_profit_clawback(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_profit_clawback ON public.withdrawals;
CREATE TRIGGER trg_withdrawal_profit_clawback
  AFTER UPDATE OF status ON public.withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_withdrawal_profit_clawback();

-- Empty wallets should not keep a leftover Profit Total from earlier credits.
INSERT INTO public.user_profit_adjustments (
  user_id, admin_id, amount, note, balance_before, balance_after
)
SELECT
  p.id,
  COALESCE(
    (SELECT id FROM public.profiles WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1),
    p.id
  ),
  -public.user_lifetime_profit(p.id),
  'Withdrawal completed — profit withdrawn',
  COALESCE(b.amount, 0),
  COALESCE(b.amount, 0)
FROM public.profiles p
LEFT JOIN public.balances b ON b.user_id = p.id
WHERE p.role IS DISTINCT FROM 'admin'
  AND COALESCE(b.amount, 0) <= 0
  AND public.user_lifetime_profit(p.id) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.withdrawals w
    WHERE w.user_id = p.id AND w.status = 'pending'
  );

REVOKE ALL ON FUNCTION public.user_lifetime_profit(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_withdrawal_profit_clawback(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.user_lifetime_profit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_withdrawal_profit_clawback(uuid) TO authenticated;
