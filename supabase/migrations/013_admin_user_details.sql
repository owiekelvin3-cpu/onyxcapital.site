-- Admin user details: location fields + secure detail RPC

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS last_known_ip TEXT,
  ADD COLUMN IF NOT EXISTS last_known_location TEXT;

CREATE OR REPLACE FUNCTION admin_get_user_details(p_user_id UUID)
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
        SELECT id, document_type, document_url, status, notes, created_at
        FROM kyc_submissions
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 5
      ) rk
    ), '[]'::jsonb)
  ) INTO v_result
  FROM profiles p
  WHERE p.id = p_user_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION admin_get_user_details(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_user_details(UUID) TO authenticated;
