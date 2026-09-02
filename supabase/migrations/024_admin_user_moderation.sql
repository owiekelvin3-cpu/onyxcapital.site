-- Admin user moderation: suspend / unsuspend / KYC reset / role / notes with required reason

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS admin_notes text;

CREATE TABLE IF NOT EXISTS public.admin_user_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (
    action_type IN ('suspend', 'unsuspend', 'reset_kyc', 'make_admin', 'demote', 'note')
  ),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_user_actions_user_id_idx
  ON public.admin_user_actions (user_id, created_at DESC);

ALTER TABLE public.admin_user_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read user actions" ON public.admin_user_actions;
CREATE POLICY "Admins can read user actions" ON public.admin_user_actions
  FOR SELECT USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.is_account_active(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = uid
      AND COALESCE(p.is_suspended, false) = false
  );
$$;

REVOKE ALL ON FUNCTION public.is_account_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_account_active(uuid) TO authenticated;

-- Block suspended users from money / product inserts (in addition to KYC)
DROP POLICY IF EXISTS "Users can insert deposits" ON public.deposits;
CREATE POLICY "Users can insert deposits" ON public.deposits
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_kyc_approved(auth.uid())
    AND public.is_account_active(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert withdrawals" ON public.withdrawals;
CREATE POLICY "Users can insert withdrawals" ON public.withdrawals
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_kyc_approved(auth.uid())
    AND public.is_account_active(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own trades" ON public.trades;
CREATE POLICY "Users can insert own trades" ON public.trades
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_kyc_approved(auth.uid())
    AND public.is_account_active(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert copy subs" ON public.copy_trading_subscriptions;
CREATE POLICY "Users can insert copy subs" ON public.copy_trading_subscriptions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_kyc_approved(auth.uid())
    AND public.is_account_active(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert mining" ON public.mining_packages;
CREATE POLICY "Users can insert mining" ON public.mining_packages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_kyc_approved(auth.uid())
    AND public.is_account_active(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert signals" ON public.signal_packages;
CREATE POLICY "Users can insert signals" ON public.signal_packages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_kyc_approved(auth.uid())
    AND public.is_account_active(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert ai subs" ON public.ai_trading_subscriptions;
CREATE POLICY "Users can insert ai subs" ON public.ai_trading_subscriptions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_kyc_approved(auth.uid())
    AND public.is_account_active(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.admin_moderate_user(
  p_user_id uuid,
  p_action text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_reason text := trim(COALESCE(p_reason, ''));
  v_profile public.profiles%ROWTYPE;
  v_action text := lower(trim(COALESCE(p_action, '')));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_admin_id = p_user_id THEN
    RAISE EXCEPTION 'You cannot moderate your own account';
  END IF;

  IF char_length(v_reason) < 3 THEN
    RAISE EXCEPTION 'A reason of at least 3 characters is required';
  END IF;

  IF v_action NOT IN ('suspend', 'unsuspend', 'reset_kyc', 'make_admin', 'demote', 'note') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_action = 'suspend' THEN
    IF v_profile.role = 'admin' THEN
      RAISE EXCEPTION 'Suspend an admin only after demoting them first';
    END IF;
    UPDATE public.profiles
    SET
      is_suspended = true,
      suspended_at = now(),
      suspended_by = v_admin_id,
      suspension_reason = v_reason,
      updated_at = now()
    WHERE id = p_user_id;

    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      p_user_id,
      'Account suspended',
      'Your account has been suspended. Reason: ' || v_reason
    );

  ELSIF v_action = 'unsuspend' THEN
    UPDATE public.profiles
    SET
      is_suspended = false,
      suspended_at = NULL,
      suspended_by = NULL,
      suspension_reason = NULL,
      updated_at = now()
    WHERE id = p_user_id;

    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      p_user_id,
      'Account reinstated',
      'Your account suspension has been lifted. Reason: ' || v_reason
    );

  ELSIF v_action = 'reset_kyc' THEN
    UPDATE public.profiles
    SET kyc_status = 'none', updated_at = now()
    WHERE id = p_user_id;

    UPDATE public.kyc_submissions
    SET status = 'rejected', notes = COALESCE(notes || E'\n', '') || 'Admin reset: ' || v_reason, updated_at = now()
    WHERE user_id = p_user_id AND status IN ('pending', 'approved');

  ELSIF v_action = 'make_admin' THEN
    IF v_profile.is_suspended THEN
      RAISE EXCEPTION 'Unsuspend the user before making them an admin';
    END IF;
    UPDATE public.profiles
    SET role = 'admin', updated_at = now()
    WHERE id = p_user_id;

  ELSIF v_action = 'demote' THEN
    IF (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last admin';
    END IF;
    UPDATE public.profiles
    SET role = 'user', updated_at = now()
    WHERE id = p_user_id;

  ELSIF v_action = 'note' THEN
    UPDATE public.profiles
    SET admin_notes = v_reason, updated_at = now()
    WHERE id = p_user_id;
  END IF;

  INSERT INTO public.admin_user_actions (user_id, admin_id, action_type, reason)
  VALUES (p_user_id, v_admin_id, v_action, v_reason);

  RETURN jsonb_build_object(
    'ok', true,
    'action', v_action,
    'user_id', p_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_moderate_user(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_moderate_user(uuid, text, text) TO authenticated;

-- Include moderation history in admin user details
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
