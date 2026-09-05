-- Rejected withdrawals must return the held cash (and spot coins) to the user.

ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

CREATE OR REPLACE FUNCTION public.restore_spot_holding_from_notes(
  p_user_id uuid,
  p_notes text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parsed jsonb;
  asset_code text;
  qty numeric(24, 12);
BEGIN
  IF p_user_id IS NULL OR p_notes IS NULL OR length(trim(p_notes)) = 0 THEN
    RETURN false;
  END IF;

  BEGIN
    parsed := p_notes::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  IF coalesce((parsed ->> 'spot_holding_withdrawal')::boolean, false) IS NOT TRUE THEN
    RETURN false;
  END IF;

  asset_code := upper(trim(parsed ->> 'asset'));
  qty := (parsed ->> 'quantity')::numeric;

  IF asset_code IS NULL OR qty IS NULL OR qty <= 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.holdings (user_id, asset, quantity, updated_at)
  VALUES (p_user_id, asset_code, qty, now())
  ON CONFLICT (user_id, asset)
  DO UPDATE SET
    quantity = public.holdings.quantity + EXCLUDED.quantity,
    updated_at = now();

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_withdrawal_rejection_refund(p_withdrawal_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.withdrawals%ROWTYPE;
  refund_amount numeric(18, 2) := 0;
BEGIN
  SELECT * INTO rec
  FROM public.withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF rec.id IS NULL THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  IF rec.refunded_at IS NOT NULL THEN
    RETURN 0;
  END IF;

  IF rec.status IS DISTINCT FROM 'rejected' THEN
    RETURN 0;
  END IF;

  refund_amount := round(GREATEST(COALESCE(rec.amount, 0), 0), 2);

  IF refund_amount > 0 THEN
    INSERT INTO public.balances (user_id, currency, amount, updated_at)
    VALUES (rec.user_id, COALESCE(nullif(trim(rec.currency), ''), 'USD'), 0, now())
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE public.balances
    SET amount = amount + refund_amount,
        updated_at = now()
    WHERE user_id = rec.user_id;
  END IF;

  PERFORM public.restore_spot_holding_from_notes(rec.user_id, rec.notes);

  UPDATE public.withdrawals
  SET refunded_at = now(),
      updated_at = now()
  WHERE id = rec.id;

  RETURN refund_amount;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_rejected_withdrawal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD.status IS DISTINCT FROM 'rejected'
    AND NEW.status = 'rejected'
    AND OLD.status IS DISTINCT FROM 'completed' THEN
    PERFORM public.apply_withdrawal_rejection_refund(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_refund ON public.withdrawals;
CREATE TRIGGER trg_withdrawal_refund
  AFTER UPDATE OF status ON public.withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.refund_rejected_withdrawal();

CREATE OR REPLACE FUNCTION public.restore_spot_holding_on_withdrawal_reject(p_withdrawal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_withdrawal_id IS NULL THEN
    RETURN;
  END IF;
  PERFORM public.apply_withdrawal_rejection_refund(p_withdrawal_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(
  p_withdrawal_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.withdrawals%ROWTYPE;
  reason text := trim(COALESCE(p_reason, ''));
  refunded numeric(18, 2) := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_withdrawal_id IS NULL THEN
    RAISE EXCEPTION 'Withdrawal is required';
  END IF;

  IF char_length(reason) < 8 THEN
    RAISE EXCEPTION 'A rejection reason is required';
  END IF;

  SELECT * INTO rec
  FROM public.withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF rec.id IS NULL THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  IF rec.status = 'rejected' THEN
    refunded := public.apply_withdrawal_rejection_refund(rec.id);
    RETURN jsonb_build_object(
      'ok', true,
      'already_rejected', true,
      'refunded', refunded
    );
  END IF;

  IF rec.status = 'completed' THEN
    RAISE EXCEPTION 'Completed withdrawals cannot be rejected';
  END IF;

  UPDATE public.withdrawals
  SET
    status = 'rejected',
    rejection_reason = reason,
    updated_at = now()
  WHERE id = rec.id
  RETURNING * INTO rec;

  refunded := public.apply_withdrawal_rejection_refund(rec.id);

  RETURN jsonb_build_object(
    'ok', true,
    'already_rejected', false,
    'refunded', refunded,
    'user_id', rec.user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.restore_spot_holding_from_notes(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_withdrawal_rejection_refund(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reject_withdrawal(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.restore_spot_holding_on_withdrawal_reject(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid, text) TO authenticated;
