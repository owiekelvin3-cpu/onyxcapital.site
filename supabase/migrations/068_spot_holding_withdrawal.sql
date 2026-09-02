-- Spot wallet: send crypto holdings to an external address (separate from main USD balance)

CREATE OR REPLACE FUNCTION public.request_spot_holding_withdrawal(
  p_asset text,
  p_quantity numeric,
  p_wallet_address text,
  p_network text DEFAULT 'TRC20',
  p_usd_amount numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  asset_code text;
  qty numeric(24, 12);
  held numeric(24, 12);
  withdrawal_id uuid;
  notes_json jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_withdrawal_allowed(uid) THEN
    RAISE EXCEPTION 'Withdrawals are not allowed on this account';
  END IF;

  asset_code := upper(trim(p_asset));
  qty := round(p_quantity::numeric, 12);

  IF asset_code IS NULL OR length(asset_code) = 0 THEN
    RAISE EXCEPTION 'Asset is required';
  END IF;

  IF qty IS NULL OR qty <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  IF p_wallet_address IS NULL OR length(trim(p_wallet_address)) < 10 THEN
    RAISE EXCEPTION 'A valid wallet address is required';
  END IF;

  SELECT h.quantity INTO held
  FROM public.holdings h
  WHERE h.user_id = uid AND h.asset = asset_code
  FOR UPDATE;

  IF held IS NULL OR held < qty THEN
    RAISE EXCEPTION 'Insufficient spot crypto holdings';
  END IF;

  UPDATE public.holdings
  SET quantity = quantity - qty,
      updated_at = now()
  WHERE user_id = uid AND asset = asset_code;

  DELETE FROM public.holdings
  WHERE user_id = uid AND asset = asset_code AND quantity <= 0;

  notes_json := jsonb_build_object(
    'spot_holding_withdrawal', true,
    'asset', asset_code,
    'quantity', qty,
    'network', coalesce(nullif(trim(p_network), ''), 'TRC20'),
    'usd_amount', greatest(coalesce(p_usd_amount, 0), 0)
  );

  INSERT INTO public.withdrawals (
    user_id,
    amount,
    currency,
    method,
    wallet_address,
    status,
    notes
  )
  VALUES (
    uid,
    greatest(round(coalesce(p_usd_amount, 0), 2), 0),
    'USD',
    'crypto',
    trim(p_wallet_address),
    'pending',
    notes_json::text
  )
  RETURNING id INTO withdrawal_id;

  RETURN withdrawal_id;
END;
$$;

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

REVOKE ALL ON FUNCTION public.request_spot_holding_withdrawal(text, numeric, text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_spot_holding_withdrawal(text, numeric, text, text, numeric) TO authenticated;

REVOKE ALL ON FUNCTION public.restore_spot_holding_on_withdrawal_reject(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_spot_holding_on_withdrawal_reject(uuid) TO authenticated;
