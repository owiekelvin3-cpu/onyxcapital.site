-- FX conversion when users change account currency

CREATE OR REPLACE FUNCTION public.fx_units_per_usd(p_currency text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE public.normalize_account_currency(p_currency)
    WHEN 'EUR' THEN 0.86
    WHEN 'GBP' THEN 0.76
    WHEN 'AUD' THEN 1.48
    WHEN 'CAD' THEN 1.32
    WHEN 'CHF' THEN 0.84
    WHEN 'JPY' THEN 142.0
    WHEN 'AED' THEN 3.67
    WHEN 'SGD' THEN 1.32
    WHEN 'HKD' THEN 7.78
    ELSE 1.0
  END;
$$;

CREATE OR REPLACE FUNCTION public.convert_currency_amount(
  p_amount numeric,
  p_from text,
  p_to text
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_from text := public.normalize_account_currency(p_from);
  v_to text := public.normalize_account_currency(p_to);
  v_usd numeric;
  v_result numeric;
BEGIN
  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN 0;
  END IF;

  IF v_from = v_to THEN
    RETURN round(p_amount, CASE WHEN v_to = 'JPY' THEN 0 ELSE 2 END);
  END IF;

  v_usd := p_amount / public.fx_units_per_usd(v_from);
  v_result := v_usd * public.fx_units_per_usd(v_to);

  IF v_to = 'JPY' THEN
    RETURN round(v_result, 0);
  END IF;

  RETURN round(v_result, 2);
END;
$$;

DROP FUNCTION IF EXISTS public.update_user_currency(text);

CREATE OR REPLACE FUNCTION public.update_user_currency(p_currency text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_to text := public.normalize_account_currency(p_currency);
  v_from text;
  v_before numeric;
  v_after numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT currency, amount
  INTO v_from, v_before
  FROM public.balances
  WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.balances (user_id, currency, amount)
    VALUES (v_uid, v_to, 0);
    v_from := 'USD';
    v_before := 0;
  END IF;

  IF v_from = v_to THEN
    UPDATE public.profiles
    SET preferred_currency = v_to, updated_at = now()
    WHERE id = v_uid;

    RETURN jsonb_build_object(
      'ok', true,
      'from_currency', v_from,
      'to_currency', v_to,
      'balance', v_before,
      'converted', false
    );
  END IF;

  v_after := public.convert_currency_amount(v_before, v_from, v_to);

  UPDATE public.balances
  SET amount = v_after, currency = v_to, updated_at = now()
  WHERE user_id = v_uid;

  UPDATE public.deposits
  SET
    amount = public.convert_currency_amount(amount, currency, v_to),
    currency = v_to,
    updated_at = now()
  WHERE user_id = v_uid;

  UPDATE public.withdrawals
  SET
    amount = public.convert_currency_amount(amount, currency, v_to),
    currency = v_to,
    updated_at = now()
  WHERE user_id = v_uid;

  UPDATE public.user_fees
  SET
    amount = public.convert_currency_amount(amount, currency, v_to),
    currency = v_to,
    updated_at = now()
  WHERE user_id = v_uid;

  UPDATE public.trades
  SET
    price = public.convert_currency_amount(price, v_from, v_to),
    profit = public.convert_currency_amount(profit, v_from, v_to)
  WHERE user_id = v_uid;

  UPDATE public.mining_packages
  SET
    investment = public.convert_currency_amount(investment, v_from, v_to),
    accrued_profit = public.convert_currency_amount(accrued_profit, v_from, v_to)
  WHERE user_id = v_uid;

  UPDATE public.signal_packages
  SET price = public.convert_currency_amount(price, v_from, v_to)
  WHERE user_id = v_uid;

  UPDATE public.ai_trading_subscriptions
  SET
    allocation = public.convert_currency_amount(allocation, v_from, v_to),
    profit_earned = public.convert_currency_amount(profit_earned, v_from, v_to),
    purchase_cost = public.convert_currency_amount(COALESCE(purchase_cost, allocation), v_from, v_to)
  WHERE user_id = v_uid;

  UPDATE public.copy_trading_subscriptions
  SET allocation = public.convert_currency_amount(allocation, v_from, v_to)
  WHERE user_id = v_uid;

  UPDATE public.ai_bot_trades
  SET
    trade_amount = public.convert_currency_amount(trade_amount, v_from, v_to),
    profit = public.convert_currency_amount(profit, v_from, v_to)
  WHERE user_id = v_uid;

  UPDATE public.trade_profit_credits
  SET
    amount = public.convert_currency_amount(amount, v_from, v_to),
    balance_before = public.convert_currency_amount(balance_before, v_from, v_to),
    balance_after = public.convert_currency_amount(balance_after, v_from, v_to)
  WHERE user_id = v_uid;

  UPDATE public.admin_balance_adjustments
  SET
    amount = public.convert_currency_amount(amount, v_from, v_to),
    balance_before = public.convert_currency_amount(balance_before, v_from, v_to),
    balance_after = public.convert_currency_amount(balance_after, v_from, v_to)
  WHERE user_id = v_uid;

  UPDATE public.profiles
  SET preferred_currency = v_to, updated_at = now()
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'from_currency', v_from,
    'to_currency', v_to,
    'balance_before', v_before,
    'balance', v_after,
    'converted', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_user_currency(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_user_currency(text) TO authenticated;
