-- Admin can credit or debit Deposit balance without changing Profit Total.

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
  v_reason text;
  v_amount numeric(18, 2);
  v_before numeric(18, 2);
  v_after numeric(18, 2);
  v_deposit_before numeric(18, 2);
  v_deposit_after numeric(18, 2);
  v_profit numeric(18, 2);
  v_profit_on_account numeric(18, 2);
  v_row public.admin_balance_adjustments%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_admin_id = p_user_id THEN
    RAISE EXCEPTION 'You cannot adjust your own deposit balance';
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
  v_profit := round((
    COALESCE((SELECT SUM(t.profit) FROM public.trades t WHERE t.user_id = p_user_id), 0)
    + COALESCE((SELECT SUM(a.amount) FROM public.user_profit_adjustments a WHERE a.user_id = p_user_id), 0)
    + COALESCE((SELECT SUM(c.amount) FROM public.copy_trading_profit_credits c WHERE c.user_id = p_user_id), 0)
    + COALESCE((SELECT SUM(r.amount) FROM public.referral_rewards r WHERE r.referrer_id = p_user_id), 0)
  )::numeric, 2);

  IF v_before <= 0 THEN
    v_profit_on_account := 0;
  ELSIF v_profit <= 0 THEN
    v_profit_on_account := 0;
  ELSE
    v_profit_on_account := LEAST(v_profit, v_before);
  END IF;

  v_deposit_before := GREATEST(0, round(v_before - v_profit_on_account, 2));

  IF v_direction = 'credit' THEN
    v_after := v_before + v_amount;
  ELSE
    IF v_deposit_before < v_amount THEN
      RAISE EXCEPTION 'Insufficient deposit balance (available: %)', v_deposit_before;
    END IF;
    v_after := v_before - v_amount;
  END IF;

  UPDATE public.balances
  SET amount = v_after,
      updated_at = now()
  WHERE user_id = p_user_id;

  v_deposit_after := CASE
    WHEN v_direction = 'credit' THEN v_deposit_before + v_amount
    ELSE v_deposit_before - v_amount
  END;

  v_reason := CASE
    WHEN v_direction = 'credit' THEN 'Deposit balance credit'
    ELSE 'Deposit balance debit'
  END;
  IF v_note IS NOT NULL THEN
    v_reason := v_reason || ': ' || v_note;
  END IF;

  INSERT INTO public.admin_balance_adjustments (
    user_id, admin_id, direction, amount, balance_before, balance_after, reason
  )
  VALUES (
    p_user_id, v_admin_id, v_direction, v_amount, v_before, v_after, v_reason
  )
  RETURNING * INTO v_row;

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    p_user_id,
    CASE WHEN v_direction = 'credit' THEN 'Deposit credited' ELSE 'Deposit adjusted' END,
    CASE
      WHEN v_direction = 'credit' THEN
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
    'reason', v_reason,
    'created_at', v_row.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_user_deposit(uuid, text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_user_deposit(uuid, text, numeric, text) TO authenticated;
