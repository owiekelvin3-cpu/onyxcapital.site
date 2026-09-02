-- Transaction notification triggers (deposits, withdrawals, trades, AI subscriptions)

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message)
  VALUES (p_user_id, p_title, p_message);
END;
$$;

CREATE OR REPLACE FUNCTION notify_all_admins(p_title TEXT, p_message TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_row RECORD;
BEGIN
  FOR admin_row IN SELECT id FROM profiles WHERE role = 'admin' LOOP
    PERFORM create_notification(admin_row.id, p_title, p_message);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION format_usd_amount(p_amount NUMERIC)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT '$' || TRIM(TO_CHAR(COALESCE(p_amount, 0), '999,999,990.00'));
$$;

-- Deposits
CREATE OR REPLACE FUNCTION notify_deposit_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  amt TEXT;
BEGIN
  SELECT email INTO user_email FROM profiles WHERE id = NEW.user_id;
  amt := format_usd_amount(NEW.amount);

  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      NEW.user_id,
      'Deposit submitted',
      'Your deposit of ' || amt || ' via ' || NEW.method || ' is pending review.'
    );
    PERFORM notify_all_admins(
      'New deposit pending',
      'Deposit of ' || amt || ' via ' || NEW.method || ' from ' || COALESCE(user_email, NEW.user_id::TEXT) || ' awaits approval.'
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'completed' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Deposit completed',
        'Your deposit of ' || amt || ' has been credited to your account.'
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Deposit rejected',
        'Your deposit of ' || amt || ' via ' || NEW.method || ' was rejected. Contact support if you need help.'
      );
    ELSIF NEW.status = 'approved' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Deposit approved',
        'Your deposit of ' || amt || ' was approved and is being processed.'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deposit_notifications ON deposits;
CREATE TRIGGER trg_deposit_notifications
  AFTER INSERT OR UPDATE OF status ON deposits
  FOR EACH ROW
  EXECUTE FUNCTION notify_deposit_changes();

-- Withdrawals
CREATE OR REPLACE FUNCTION notify_withdrawal_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  amt TEXT;
BEGIN
  SELECT email INTO user_email FROM profiles WHERE id = NEW.user_id;
  amt := format_usd_amount(NEW.amount);

  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      NEW.user_id,
      'Withdrawal submitted',
      'Your withdrawal request of ' || amt || ' via ' || NEW.method || ' is pending review.'
    );
    PERFORM notify_all_admins(
      'New withdrawal pending',
      'Withdrawal of ' || amt || ' via ' || NEW.method || ' from ' || COALESCE(user_email, NEW.user_id::TEXT) || ' awaits processing.'
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'completed' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Withdrawal completed',
        'Your withdrawal of ' || amt || ' has been processed successfully.'
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Withdrawal rejected',
        'Your withdrawal of ' || amt || ' via ' || NEW.method || ' was rejected. Contact support for details.'
      );
    ELSIF NEW.status = 'approved' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Withdrawal approved',
        'Your withdrawal of ' || amt || ' was approved and is being processed.'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_notifications ON withdrawals;
CREATE TRIGGER trg_withdrawal_notifications
  AFTER INSERT OR UPDATE OF status ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION notify_withdrawal_changes();

-- Trades
CREATE OR REPLACE FUNCTION notify_trade_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  side TEXT;
BEGIN
  side := UPPER(NEW.type);

  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      NEW.user_id,
      'Trade placed',
      side || ' ' || NEW.asset || ' — ' || NEW.amount || ' @ ' || format_usd_amount(NEW.price) || ' (' || NEW.status || ').'
    );

    IF NEW.status = 'pending' THEN
      SELECT email INTO user_email FROM profiles WHERE id = NEW.user_id;
      PERFORM notify_all_admins(
        'New trade',
        side || ' ' || NEW.asset || ' by ' || COALESCE(user_email, NEW.user_id::TEXT) || ' — ' || format_usd_amount(NEW.price) || '.'
      );
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'completed' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Trade completed',
        side || ' ' || NEW.asset || ' filled at ' || format_usd_amount(NEW.price) || '.'
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Trade rejected',
        side || ' ' || NEW.asset || ' order was rejected or cancelled.'
      );
    ELSIF NEW.status = 'approved' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Trade approved',
        side || ' ' || NEW.asset || ' order approved and queued for execution.'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trade_notifications ON trades;
CREATE TRIGGER trg_trade_notifications
  AFTER INSERT OR UPDATE OF status ON trades
  FOR EACH ROW
  EXECUTE FUNCTION notify_trade_changes();

-- AI trading subscriptions
CREATE OR REPLACE FUNCTION notify_ai_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      NEW.user_id,
      'AI bot activated',
      NEW.bot_name || ' is now active with ' || format_usd_amount(NEW.allocation) || ' allocated (' || NEW.market || ').'
    );
    PERFORM notify_all_admins(
      'AI bot activated',
      NEW.bot_name || ' activated with ' || format_usd_amount(NEW.allocation) || ' on ' || NEW.market || ' market.'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_subscription_notifications ON ai_trading_subscriptions;
CREATE TRIGGER trg_ai_subscription_notifications
  AFTER INSERT ON ai_trading_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION notify_ai_subscription();

-- Allow system triggers to insert; keep admin manual insert policy
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_all_admins(TEXT, TEXT) TO authenticated;
