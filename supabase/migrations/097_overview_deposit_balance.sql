-- Run this in the Onyx Capital Supabase SQL editor (project fioiyojnhiivbegkqjiq).
-- Makes admin Add/Remove deposit funds show on the user Overview Deposit balance.
-- Safe to run even if 096 was already applied.

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

CREATE OR REPLACE FUNCTION public.user_deposit_balance(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_cash numeric(18, 2);
  v_profit numeric(18, 2);
  v_credits numeric(18, 2);
  v_profit_on_account numeric(18, 2);
  v_room numeric(18, 2);
BEGIN
  SELECT COALESCE(amount, 0) INTO v_cash
  FROM public.balances
  WHERE user_id = p_user_id;

  v_cash := COALESCE(v_cash, 0);
  v_profit := round((
    COALESCE((SELECT SUM(t.profit) FROM public.trades t WHERE t.user_id = p_user_id), 0)
    + COALESCE((SELECT SUM(a.amount) FROM public.user_profit_adjustments a WHERE a.user_id = p_user_id), 0)
    + COALESCE((SELECT SUM(c.amount) FROM public.copy_trading_profit_credits c WHERE c.user_id = p_user_id), 0)
    + COALESCE((SELECT SUM(r.amount) FROM public.referral_rewards r WHERE r.referrer_id = p_user_id), 0)
  )::numeric, 2);
  v_credits := COALESCE(public.user_deposit_credits(p_user_id), 0);

  IF v_cash <= 0 THEN
    RETURN 0;
  END IF;

  v_room := GREATEST(0, round(v_cash - GREATEST(0, v_credits), 2));

  IF v_profit <= 0 THEN
    v_profit_on_account := 0;
  ELSE
    v_profit_on_account := LEAST(v_profit, v_room);
  END IF;

  RETURN GREATEST(0, round(v_cash - v_profit_on_account, 2));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_user_deposit(
  p_user_id uuid,
  p_direction text,
  p_amount numeric,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_direction text := lower(trim(COALESCE(p_direction, '')));
  v_note text := nullif(trim(COALESCE(p_note, '')), '');
  v_amount numeric(18, 2);
  v_signed numeric(18, 2);
  v_before numeric(18, 2);
  v_after numeric(18, 2);
  v_deposit_before numeric(18, 2);
  v_deposit_after numeric(18, 2);
  v_row public.user_deposit_adjustments%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_direction NOT IN ('credit', 'debit') THEN
    RAISE EXCEPTION 'Direction must be credit or debit';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  v_amount := round(p_amount, 2);

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO public.balances (user_id, currency, amount)
  VALUES (p_user_id, 'USD', 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT amount INTO v_before
  FROM public.balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_before := COALESCE(v_before, 0);
  v_deposit_before := public.user_deposit_balance(p_user_id);

  IF v_direction = 'credit' THEN
    v_after := v_before + v_amount;
    v_signed := v_amount;
  ELSE
    IF v_deposit_before < v_amount THEN
      RAISE EXCEPTION 'Insufficient deposit balance (available: %)', v_deposit_before;
    END IF;
    v_after := v_before - v_amount;
    v_signed := -v_amount;
  END IF;

  UPDATE public.balances
  SET amount = v_after,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.user_deposit_adjustments (
    user_id, admin_id, amount, note, balance_before, balance_after
  )
  VALUES (
    p_user_id, v_admin_id, v_signed, v_note, v_before, v_after
  )
  RETURNING * INTO v_row;

  v_deposit_after := public.user_deposit_balance(p_user_id);

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    p_user_id,
    CASE WHEN v_signed >= 0 THEN 'Deposit credited' ELSE 'Deposit adjusted' END,
    CASE
      WHEN v_signed >= 0 THEN
        'An administrator added ' || v_amount::text || ' USD to your deposit balance.'
      ELSE
        'An administrator removed ' || v_amount::text || ' USD from your deposit balance.'
    END
    || CASE WHEN v_note IS NOT NULL THEN ' Note: ' || v_note ELSE '' END
  );

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'direction', v_direction,
    'amount', v_amount,
    'balance_before', v_before,
    'balance_after', v_after,
    'deposit_before', v_deposit_before,
    'deposit_after', v_deposit_after,
    'note', v_note,
    'created_at', v_row.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.user_deposit_credits(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_deposit_credits(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.user_deposit_balance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_deposit_balance(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_adjust_user_deposit(uuid, text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_user_deposit(uuid, text, numeric, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
