-- Admin-assigned withdrawal fees that hard-block withdrawals until paid

CREATE TABLE IF NOT EXISTS user_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL,
  label TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'waived', 'cancelled')),
  notes TEXT,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_fees_user_id ON user_fees(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fees_status ON user_fees(status);
CREATE INDEX IF NOT EXISTS idx_user_fees_user_pending ON user_fees(user_id) WHERE status = 'pending';

ALTER TABLE user_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own fees" ON user_fees;
CREATE POLICY "Users can view own fees" ON user_fees
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage fees" ON user_fees;
CREATE POLICY "Admins manage fees" ON user_fees
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Notify user when a fee is assigned
CREATE OR REPLACE FUNCTION notify_user_fee_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, title, message)
    VALUES (
      NEW.user_id,
      'Withdrawal fee required',
      format('A %s fee of %s %s must be paid before you can withdraw.', NEW.label, NEW.amount, NEW.currency)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_fee_notify ON user_fees;
CREATE TRIGGER trg_user_fee_notify
  AFTER INSERT ON user_fees
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_fee_assigned();

-- Block new withdrawals while any fee is outstanding
CREATE OR REPLACE FUNCTION block_withdrawal_if_fees_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_count INT;
BEGIN
  SELECT COUNT(*)::int INTO pending_count
  FROM user_fees
  WHERE user_id = NEW.user_id AND status = 'pending';

  IF pending_count > 0 THEN
    RAISE EXCEPTION 'Outstanding fees must be paid before withdrawing';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_fee_gate ON withdrawals;
CREATE TRIGGER trg_withdrawal_fee_gate
  BEFORE INSERT ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION block_withdrawal_if_fees_pending();

-- User pays a pending fee from balance
CREATE OR REPLACE FUNCTION pay_user_fee(p_fee_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee user_fees%ROWTYPE;
  v_balance NUMERIC;
BEGIN
  SELECT * INTO v_fee FROM user_fees WHERE id = p_fee_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fee not found';
  END IF;

  IF v_fee.user_id <> auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_fee.status <> 'pending' THEN
    RAISE EXCEPTION 'Fee is not pending';
  END IF;

  SELECT amount INTO v_balance FROM balances WHERE user_id = v_fee.user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_fee.amount THEN
    RAISE EXCEPTION 'Insufficient balance to pay this fee';
  END IF;

  UPDATE balances
  SET amount = amount - v_fee.amount,
      updated_at = NOW()
  WHERE user_id = v_fee.user_id;

  UPDATE user_fees
  SET status = 'paid',
      paid_at = NOW(),
      updated_at = NOW()
  WHERE id = p_fee_id
  RETURNING * INTO v_fee;

  RETURN to_jsonb(v_fee);
END;
$$;

-- Admin assigns a fee
CREATE OR REPLACE FUNCTION admin_assign_user_fee(
  p_user_id UUID,
  p_fee_type TEXT,
  p_label TEXT,
  p_amount NUMERIC,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee user_fees%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  IF p_label IS NULL OR length(trim(p_label)) = 0 THEN
    RAISE EXCEPTION 'Label is required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO user_fees (user_id, fee_type, label, amount, notes, assigned_by, status)
  VALUES (p_user_id, p_fee_type, trim(p_label), round(p_amount, 2), nullif(trim(p_notes), ''), auth.uid(), 'pending')
  RETURNING * INTO v_fee;

  RETURN to_jsonb(v_fee);
END;
$$;

-- Admin marks fee paid / waived / cancelled (no balance debit)
CREATE OR REPLACE FUNCTION admin_update_user_fee_status(
  p_fee_id UUID,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee user_fees%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_status NOT IN ('paid', 'waived', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT * INTO v_fee FROM user_fees WHERE id = p_fee_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fee not found';
  END IF;

  IF v_fee.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending fees can be updated';
  END IF;

  UPDATE user_fees
  SET status = p_status,
      paid_at = CASE WHEN p_status = 'paid' THEN NOW() ELSE paid_at END,
      updated_at = NOW()
  WHERE id = p_fee_id
  RETURNING * INTO v_fee;

  RETURN to_jsonb(v_fee);
END;
$$;

REVOKE ALL ON FUNCTION pay_user_fee(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pay_user_fee(UUID) TO authenticated;

REVOKE ALL ON FUNCTION admin_assign_user_fee(UUID, TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_assign_user_fee(UUID, TEXT, TEXT, NUMERIC, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION admin_update_user_fee_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_update_user_fee_status(UUID, TEXT) TO authenticated;

-- Extend admin user details with fees
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
