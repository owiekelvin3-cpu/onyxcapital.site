-- Reject must credit cash once. Spot restore only returns coins, never cash.

CREATE OR REPLACE FUNCTION public.restore_spot_holding_on_withdrawal_reject(
  p_withdrawal_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_notes text;
  parsed jsonb;
  uid uuid;
  asset_code text;
  qty numeric(24, 12);
BEGIN
  IF p_withdrawal_id IS NULL THEN
    RETURN;
  END IF;

  SELECT w.notes, w.user_id INTO row_notes, uid
  FROM public.withdrawals w
  WHERE w.id = p_withdrawal_id;

  IF row_notes IS NULL OR uid IS NULL THEN
    RETURN;
  END IF;

  BEGIN
    parsed := row_notes::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  IF coalesce((parsed ->> 'spot_holding_withdrawal')::boolean, false) IS NOT TRUE THEN
    RETURN;
  END IF;

  asset_code := upper(trim(parsed ->> 'asset'));
  qty := (parsed ->> 'quantity')::numeric;

  IF asset_code IS NULL OR qty IS NULL OR qty <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.holdings (user_id, asset, quantity, updated_at)
  VALUES (uid, asset_code, qty, now())
  ON CONFLICT (user_id, asset)
  DO UPDATE SET
    quantity = public.holdings.quantity + EXCLUDED.quantity,
    updated_at = now();
END;
$$;

ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

CREATE OR REPLACE FUNCTION public.refund_rejected_withdrawal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE'
    OR OLD.status IS NOT DISTINCT FROM 'rejected'
    OR NEW.status IS DISTINCT FROM 'rejected'
    OR OLD.status = 'completed'
    OR NEW.refunded_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.amount, 0) > 0 THEN
    INSERT INTO public.balances (user_id, currency, amount, updated_at)
    VALUES (NEW.user_id, COALESCE(nullif(trim(NEW.currency), ''), 'USD'), 0, now())
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE public.balances
    SET amount = amount + NEW.amount,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;

  UPDATE public.withdrawals
  SET refunded_at = now()
  WHERE id = NEW.id AND refunded_at IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_refund ON public.withdrawals;
CREATE TRIGGER trg_withdrawal_refund
  AFTER UPDATE OF status ON public.withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.refund_rejected_withdrawal();
