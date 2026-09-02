-- Admin can credit or debit a user's balance with a required reason and audit trail

CREATE TABLE IF NOT EXISTS public.admin_balance_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount numeric(18, 2) NOT NULL CHECK (amount > 0),
  balance_before numeric(18, 2) NOT NULL,
  balance_after numeric(18, 2) NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_balance_adjustments_user_id_idx
  ON public.admin_balance_adjustments (user_id, created_at DESC);

ALTER TABLE public.admin_balance_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read balance adjustments" ON public.admin_balance_adjustments;
CREATE POLICY "Admins can read balance adjustments" ON public.admin_balance_adjustments
  FOR SELECT USING (public.is_admin());

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

  IF v_admin_id = p_user_id THEN
    RAISE EXCEPTION 'You cannot adjust your own balance';
  END IF;

  IF v_direction NOT IN ('credit', 'debit') THEN
    RAISE EXCEPTION 'Direction must be credit or debit';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  v_amount := round(p_amount, 2);

  IF char_length(v_reason) < 3 THEN
    RAISE EXCEPTION 'A reason of at least 3 characters is required';
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

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
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

CREATE OR REPLACE FUNCTION public.admin_get_user_details(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'profile', to_jsonb(p.*),
    'balance', COALESCE((SELECT b.amount FROM balances b WHERE b.user_id = p_user_id), 0),
    'outstanding_fees_total', COALESCE((
      SELECT SUM(f.amount) FROM user_fees f WHERE f.user_id = p_user_id AND f.status = 'pending'
    ), 0),
    'auth', (
      SELECT jsonb_build_object(
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'email_confirmed_at', u.email_confirmed_at,
        'phone', u.phone,
        'has_password', (u.encrypted_password IS NOT NULL),
        'providers', COALESCE((
          SELECT jsonb_agg(DISTINCT i.provider)
          FROM auth.identities i
          WHERE i.user_id = u.id
        ), '[]'::jsonb)
      )
      FROM auth.users u
      WHERE u.id = p_user_id
    ),
    'stats', jsonb_build_object(
      'deposits_count', (SELECT COUNT(*)::int FROM deposits d WHERE d.user_id = p_user_id),
      'deposits_total', COALESCE((SELECT SUM(d.amount) FROM deposits d WHERE d.user_id = p_user_id AND d.status = 'completed'), 0),
      'withdrawals_count', (SELECT COUNT(*)::int FROM withdrawals w WHERE w.user_id = p_user_id),
      'withdrawals_total', COALESCE((SELECT SUM(w.amount) FROM withdrawals w WHERE w.user_id = p_user_id AND w.status = 'completed'), 0),
      'trades_count', (SELECT COUNT(*)::int FROM trades t WHERE t.user_id = p_user_id),
      'active_trades', (SELECT COUNT(*)::int FROM trades t WHERE t.user_id = p_user_id AND t.status = 'active'),
      'ai_bots_active', (SELECT COUNT(*)::int FROM ai_trading_subscriptions a WHERE a.user_id = p_user_id AND a.status = 'active')
    ),
    'fees', COALESCE((
      SELECT jsonb_agg(row_to_json(rf))
      FROM (
        SELECT id, fee_type, label, amount, currency, status, notes, assigned_by, paid_at, created_at, updated_at
        FROM user_fees
        WHERE user_id = p_user_id
        ORDER BY
          CASE status WHEN 'pending' THEN 0 ELSE 1 END,
          created_at DESC
        LIMIT 50
      ) rf
    ), '[]'::jsonb),
    'balance_adjustments', COALESCE((
      SELECT jsonb_agg(row_to_json(ba))
      FROM (
        SELECT a.id, a.direction, a.amount, a.balance_before, a.balance_after, a.reason, a.created_at, a.admin_id,
               ap.email AS admin_email, ap.full_name AS admin_name
        FROM admin_balance_adjustments a
        LEFT JOIN profiles ap ON ap.id = a.admin_id
        WHERE a.user_id = p_user_id
        ORDER BY a.created_at DESC
        LIMIT 20
      ) ba
    ), '[]'::jsonb),
    'recent_deposits', COALESCE((
      SELECT jsonb_agg(row_to_json(rd))
      FROM (
        SELECT id, amount, method, status, created_at
        FROM deposits
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 5
      ) rd
    ), '[]'::jsonb),
    'recent_withdrawals', COALESCE((
      SELECT jsonb_agg(row_to_json(rw))
      FROM (
        SELECT id, amount, method, status, wallet_address, created_at
        FROM withdrawals
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 5
      ) rw
    ), '[]'::jsonb),
    'kyc_submissions', COALESCE((
      SELECT jsonb_agg(row_to_json(rk))
      FROM (
        SELECT id, document_type, document_url, selfie_url, face_captured_at, status, notes, created_at
        FROM kyc_submissions
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 10
      ) rk
    ), '[]'::jsonb),
    'moderation_actions', COALESCE((
      SELECT jsonb_agg(row_to_json(ma))
      FROM (
        SELECT a.id, a.action_type, a.reason, a.created_at, a.admin_id,
               ap.email AS admin_email, ap.full_name AS admin_name
        FROM admin_user_actions a
        LEFT JOIN profiles ap ON ap.id = a.admin_id
        WHERE a.user_id = p_user_id
        ORDER BY a.created_at DESC
        LIMIT 20
      ) ma
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM profiles p
  WHERE p.id = p_user_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_user_details(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_user_details(UUID) TO authenticated;
