-- Allow any authenticated user to request a withdrawal.
-- KYC, account suspension, and pending fees no longer block payouts.
-- Balance hold / insufficient-funds checks remain in place.

CREATE OR REPLACE FUNCTION public.is_withdrawal_allowed(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uid IS NOT NULL;
$$;

DROP POLICY IF EXISTS "Users can insert withdrawals" ON public.withdrawals;
CREATE POLICY "Users can insert withdrawals" ON public.withdrawals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.block_withdrawal_if_fees_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_withdrawal_eligibility()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pending int;
  v_balance numeric;
  v_suspended boolean := false;
  v_reason text;
  v_kyc_status text := 'none';
  v_kyc_approved boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COUNT(*)::int INTO v_pending
  FROM user_fees
  WHERE user_id = v_uid AND status = 'pending';

  SELECT COALESCE(amount, 0) INTO v_balance
  FROM balances
  WHERE user_id = v_uid
  LIMIT 1;

  SELECT
    COALESCE(p.is_suspended, false),
    p.suspension_reason,
    COALESCE(p.kyc_status, 'none')
  INTO v_suspended, v_reason, v_kyc_status
  FROM profiles p
  WHERE p.id = v_uid;

  v_kyc_approved := public.is_kyc_approved(v_uid);

  RETURN jsonb_build_object(
    'pending_fees_count', v_pending,
    'can_withdraw', true,
    'is_suspended', v_suspended,
    'suspension_reason', v_reason,
    'kyc_status', v_kyc_status,
    'kyc_approved', v_kyc_approved,
    'portfolio', jsonb_build_object('balance', v_balance)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_withdrawal_eligibility() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_withdrawal_eligibility() TO authenticated;

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
