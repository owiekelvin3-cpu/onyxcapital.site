-- Admin profit / loss adjustments for dashboard Profit Total

CREATE TABLE IF NOT EXISTS public.user_profit_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(18, 2) NOT NULL CHECK (amount <> 0),
  note text,
  balance_before numeric(18, 2) NOT NULL,
  balance_after numeric(18, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_profit_adjustments_user_id_idx
  ON public.user_profit_adjustments (user_id, created_at DESC);

ALTER TABLE public.user_profit_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profit adjustments" ON public.user_profit_adjustments;
CREATE POLICY "Users can view own profit adjustments" ON public.user_profit_adjustments
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage profit adjustments" ON public.user_profit_adjustments;
CREATE POLICY "Admins can manage profit adjustments" ON public.user_profit_adjustments
  FOR ALL USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_adjust_user_profit(
  p_user_id uuid,
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
  v_amount numeric(18, 2);
  v_note text := nullif(trim(COALESCE(p_note, '')), '');
  v_before numeric(18, 2);
  v_after numeric(18, 2);
  v_profit_total numeric(18, 2);
  v_row public.user_profit_adjustments%ROWTYPE;
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

  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Amount must be a non-zero profit or loss';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_admin_id = p_user_id THEN
    RAISE EXCEPTION 'You cannot adjust profit on your own account';
  END IF;

  v_amount := round(p_amount, 2);

  INSERT INTO public.balances (user_id, currency, amount)
  VALUES (p_user_id, 'USD', 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT amount INTO v_before
  FROM public.balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_before := COALESCE(v_before, 0);
  v_after := v_before + v_amount;

  IF v_after < 0 THEN
    RAISE EXCEPTION 'Insufficient balance for this loss adjustment';
  END IF;

  UPDATE public.balances
  SET amount = v_after,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.user_profit_adjustments (
    user_id, admin_id, amount, note, balance_before, balance_after
  )
  VALUES (
    p_user_id, v_admin_id, v_amount, v_note, v_before, v_after
  )
  RETURNING * INTO v_row;

  SELECT
    COALESCE((SELECT SUM(t.profit) FROM public.trades t WHERE t.user_id = p_user_id), 0)
    + COALESCE((SELECT SUM(a.amount) FROM public.user_profit_adjustments a WHERE a.user_id = p_user_id), 0)
  INTO v_profit_total;

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    p_user_id,
    CASE WHEN v_amount >= 0 THEN 'Profit credited' ELSE 'Loss recorded' END,
    CASE
      WHEN v_amount >= 0 THEN
        'A profit of ' || abs(v_amount)::text || ' USD was added to your account.'
      ELSE
        'A loss of ' || abs(v_amount)::text || ' USD was recorded on your account.'
    END
    || CASE WHEN v_note IS NOT NULL THEN ' Note: ' || v_note ELSE '' END
  );

  RETURN jsonb_build_object(
    'ok', true,
    'adjustment_id', v_row.id,
    'user_id', p_user_id,
    'amount', v_amount,
    'profit_total', v_profit_total,
    'balance_before', v_before,
    'balance_after', v_after,
    'note', v_note,
    'created_at', v_row.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_user_profit(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_user_profit(uuid, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_user_details(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_profit_total numeric(18, 2);
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT
    COALESCE((SELECT SUM(t.profit) FROM public.trades t WHERE t.user_id = p_user_id), 0)
    + COALESCE((SELECT SUM(a.amount) FROM public.user_profit_adjustments a WHERE a.user_id = p_user_id), 0)
  INTO v_profit_total;

  SELECT jsonb_build_object(
    'profile', to_jsonb(p.*),
    'balance', COALESCE((SELECT b.amount FROM balances b WHERE b.user_id = p_user_id), 0),
    'profit_total', COALESCE(v_profit_total, 0),
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
    'profit_adjustments', COALESCE((
      SELECT jsonb_agg(row_to_json(pa))
      FROM (
        SELECT a.id, a.amount, a.note, a.balance_before, a.balance_after, a.created_at, a.admin_id,
               ap.email AS admin_email, ap.full_name AS admin_name
        FROM user_profit_adjustments a
        LEFT JOIN profiles ap ON ap.id = a.admin_id
        WHERE a.user_id = p_user_id
        ORDER BY a.created_at DESC
        LIMIT 20
      ) pa
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
