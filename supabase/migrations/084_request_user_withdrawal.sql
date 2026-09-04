-- Make assigned withdrawal codes actually usable for payouts.
-- Reloads PostgREST so the code column is visible, and adds an RPC that
-- checks the code inside SQL instead of relying on a client insert.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS withdrawal_code text;

ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS withdrawal_code text;

CREATE OR REPLACE FUNCTION public.normalize_withdrawal_code(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(upper(regexp_replace(COALESCE(p_code, ''), '\s+', '', 'g')), '');
$$;

CREATE OR REPLACE FUNCTION public.user_has_withdrawal_code(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.normalize_withdrawal_code(p.withdrawal_code) IS NOT NULL
  FROM public.profiles p
  WHERE p.id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.has_active_withdrawal_code()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.user_has_withdrawal_code(auth.uid()), false);
$$;

CREATE OR REPLACE FUNCTION public.assert_withdrawal_code(p_user_id uuid, p_code text)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored text;
  v_given text;
BEGIN
  SELECT public.normalize_withdrawal_code(p.withdrawal_code)
  INTO v_stored
  FROM public.profiles p
  WHERE p.id = p_user_id;

  IF v_stored IS NULL THEN
    RAISE EXCEPTION 'No withdrawal code assigned';
  END IF;

  v_given := public.normalize_withdrawal_code(p_code);
  IF v_given IS NULL OR v_given IS DISTINCT FROM v_stored THEN
    RAISE EXCEPTION 'Invalid withdrawal code';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_withdrawal_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_withdrawal_code(NEW.user_id, NEW.withdrawal_code);
  NEW.withdrawal_code := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_withdrawal_code ON public.withdrawals;
CREATE TRIGGER trg_enforce_withdrawal_code
  BEFORE INSERT ON public.withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_withdrawal_code();

CREATE OR REPLACE FUNCTION public.admin_set_user_withdrawal_code(
  p_user_id uuid,
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := public.normalize_withdrawal_code(p_code);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User is required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  UPDATE public.profiles
  SET withdrawal_code = v_code, updated_at = now()
  WHERE id = p_user_id;

  IF v_code IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      p_user_id,
      'Withdrawal code assigned',
      'A unique withdrawal code is now active on your account. Enter it when you request a payout. Contact support if you need the code.'
    );
  ELSE
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      p_user_id,
      'Withdrawal code removed',
      'Your withdrawal code is no longer active. Contact support if you need a new one.'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'has_code', v_code IS NOT NULL,
    'withdrawal_code', v_code
  );
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
  v_has_code boolean := false;
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
    COALESCE(p.kyc_status, 'none'),
    public.normalize_withdrawal_code(p.withdrawal_code) IS NOT NULL
  INTO v_suspended, v_reason, v_kyc_status, v_has_code
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
    'has_withdrawal_code', COALESCE(v_has_code, false),
    'portfolio', jsonb_build_object('balance', v_balance)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.request_user_withdrawal(
  p_amount numeric,
  p_currency text,
  p_method text,
  p_wallet_address text,
  p_notes text,
  p_withdrawal_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  rec public.withdrawals;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Enter a valid amount';
  END IF;

  PERFORM public.assert_withdrawal_code(uid, p_withdrawal_code);

  INSERT INTO public.withdrawals (
    user_id,
    amount,
    currency,
    method,
    wallet_address,
    notes,
    status,
    withdrawal_code
  )
  VALUES (
    uid,
    round(p_amount::numeric, 2),
    COALESCE(nullif(trim(p_currency), ''), 'USD'),
    COALESCE(nullif(trim(p_method), ''), 'crypto'),
    nullif(trim(p_wallet_address), ''),
    p_notes,
    'pending',
    p_withdrawal_code
  )
  RETURNING * INTO rec;

  RETURN to_jsonb(rec) - 'withdrawal_code';
END;
$$;

DROP FUNCTION IF EXISTS public.request_spot_holding_withdrawal(text, numeric, text, text, numeric);

CREATE OR REPLACE FUNCTION public.request_spot_holding_withdrawal(
  p_asset text,
  p_quantity numeric,
  p_wallet_address text,
  p_network text DEFAULT 'TRC20',
  p_usd_amount numeric DEFAULT 0,
  p_withdrawal_code text DEFAULT NULL
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

  PERFORM public.assert_withdrawal_code(uid, p_withdrawal_code);

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
    notes,
    withdrawal_code
  )
  VALUES (
    uid,
    greatest(round(coalesce(p_usd_amount, 0), 2), 0),
    'USD',
    'crypto',
    trim(p_wallet_address),
    'pending',
    notes_json::text,
    p_withdrawal_code
  )
  RETURNING id INTO withdrawal_id;

  RETURN withdrawal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_withdrawal_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_has_withdrawal_code(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_active_withdrawal_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_withdrawal_code(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_user_withdrawal_code(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_withdrawal_eligibility() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_user_withdrawal(numeric, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_spot_holding_withdrawal(text, numeric, text, text, numeric, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_active_withdrawal_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_withdrawal_code(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_withdrawal_eligibility() TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_user_withdrawal(numeric, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_spot_holding_withdrawal(text, numeric, text, text, numeric, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
