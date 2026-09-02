-- Make balance adjust more reliable: default reason, allow adjusting any user including self
CREATE OR REPLACE FUNCTION public.admin_adjust_user_balance(
  p_user_id uuid,
  p_direction text,
  p_amount numeric,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_direction text := lower(trim(COALESCE(p_direction, '')));
  v_reason text := trim(COALESCE(p_reason, ''));
  v_amount numeric(18, 2);
  v_before numeric(18, 2);
  v_after numeric(18, 2);
  v_row public.admin_balance_adjustments%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User is required';
  END IF;

  IF v_direction NOT IN ('credit', 'debit') THEN
    RAISE EXCEPTION 'Direction must be credit or debit';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  v_amount := round(p_amount, 2);

  IF char_length(v_reason) < 3 THEN
    v_reason := 'Admin balance adjustment';
  END IF;

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

  IF v_direction = 'credit' THEN
    v_after := v_before + v_amount;
  ELSE
    IF v_before < v_amount THEN
      RAISE EXCEPTION 'Insufficient balance to remove that amount (available: %)', v_before;
    END IF;
    v_after := v_before - v_amount;
  END IF;

  UPDATE public.balances
  SET amount = v_after,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.admin_balance_adjustments (
    user_id, admin_id, direction, amount, balance_before, balance_after, reason
  )
  VALUES (
    p_user_id, v_admin_id, v_direction, v_amount, v_before, v_after, v_reason
  )
  RETURNING * INTO v_row;

  PERFORM create_notification(
    p_user_id,
    CASE WHEN v_direction = 'credit' THEN 'Balance credited' ELSE 'Balance adjusted' END,
    CASE
      WHEN v_direction = 'credit' THEN
        'An administrator added ' || v_amount::text || ' USD to your balance. Reason: ' || v_reason
      ELSE
        'An administrator removed ' || v_amount::text || ' USD from your balance. Reason: ' || v_reason
    END
  );

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'direction', v_direction,
    'amount', v_amount,
    'balance_before', v_before,
    'balance_after', v_after,
    'reason', v_reason,
    'created_at', v_row.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_user_balance(uuid, text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_user_balance(uuid, text, numeric, text) TO authenticated;
