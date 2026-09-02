-- Withdrawal fees cannot be paid from existing balance.
-- Users must deposit funds; on deposit approval, pending fees are settled
-- using only that deposit's amount (not pre-existing balance).

ALTER TABLE public.user_fees
  ADD COLUMN IF NOT EXISTS paid_via_deposit_id UUID REFERENCES public.deposits(id) ON DELETE SET NULL;

ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS related_fee_id UUID REFERENCES public.user_fees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_fees_paid_via_deposit
  ON public.user_fees (paid_via_deposit_id)
  WHERE paid_via_deposit_id IS NOT NULL;

-- Block paying fees from wallet balance
CREATE OR REPLACE FUNCTION public.pay_user_fee(p_fee_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Withdrawal fees cannot be paid from your existing balance. Deposit the required fee amount first; it will be cleared when that deposit is approved.';
END;
$$;

-- After a deposit is completed, settle pending fees using only this deposit's amount
CREATE OR REPLACE FUNCTION public.settle_pending_fees_from_deposit(p_deposit_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dep public.deposits%ROWTYPE;
  v_fee public.user_fees%ROWTYPE;
  v_budget NUMERIC(18, 2);
  v_settled INT := 0;
  v_total NUMERIC(18, 2) := 0;
  v_balance NUMERIC(18, 2);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_dep
  FROM public.deposits
  WHERE id = p_deposit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deposit not found';
  END IF;

  IF v_dep.user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_dep.status NOT IN ('completed', 'approved') THEN
    RAISE EXCEPTION 'Deposit must be completed before settling fees';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM public.user_fees
  WHERE paid_via_deposit_id = v_dep.id;

  v_budget := ROUND(COALESCE(v_dep.amount, 0), 2) - ROUND(v_total, 2);
  v_total := 0;

  IF v_budget <= 0 THEN
    RETURN jsonb_build_object('settled_count', 0, 'settled_total', 0);
  END IF;

  SELECT amount INTO v_balance
  FROM public.balances
  WHERE user_id = v_dep.user_id
  FOR UPDATE;

  v_balance := COALESCE(v_balance, 0);

  -- Settle pending fees using only this deposit's amount as budget
  FOR v_fee IN
    SELECT *
    FROM public.user_fees
    WHERE user_id = v_dep.user_id
      AND status = 'pending'
      AND (v_dep.related_fee_id IS NULL OR id = v_dep.related_fee_id)
    ORDER BY created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_budget <= 0;

    IF ROUND(v_fee.amount, 2) > v_budget THEN
      CONTINUE;
    END IF;

    -- Safety: balance must still hold the fee after the deposit credit
    IF v_balance < ROUND(v_fee.amount, 2) THEN
      CONTINUE;
    END IF;

    UPDATE public.balances
    SET amount = amount - ROUND(v_fee.amount, 2),
        updated_at = now()
    WHERE user_id = v_dep.user_id;

    UPDATE public.user_fees
    SET status = 'paid',
        paid_at = now(),
        paid_via_deposit_id = v_dep.id,
        updated_at = now()
    WHERE id = v_fee.id;

    v_budget := v_budget - ROUND(v_fee.amount, 2);
    v_balance := v_balance - ROUND(v_fee.amount, 2);
    v_settled := v_settled + 1;
    v_total := v_total + ROUND(v_fee.amount, 2);
  END LOOP;

  RETURN jsonb_build_object(
    'settled_count', v_settled,
    'settled_total', v_total,
    'deposit_id', v_dep.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.settle_pending_fees_from_deposit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_user_fee(UUID) TO authenticated;
