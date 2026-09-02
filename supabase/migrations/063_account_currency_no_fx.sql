-- Account currency is a display label only.
-- Changing it must not convert or reduce wallet amounts.

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
  v_balance numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT currency, amount
  INTO v_from, v_balance
  FROM public.balances
  WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.balances (user_id, currency, amount)
    VALUES (v_uid, v_to, 0);
    v_from := v_to;
    v_balance := 0;
  END IF;

  UPDATE public.profiles
  SET preferred_currency = v_to, updated_at = now()
  WHERE id = v_uid;

  UPDATE public.balances
  SET currency = v_to, updated_at = now()
  WHERE user_id = v_uid;

  -- Relabel fiat rows only. Leave crypto asset codes (BTC, ETH, …) unchanged.
  UPDATE public.deposits
  SET currency = v_to, updated_at = now()
  WHERE user_id = v_uid
    AND EXISTS (SELECT 1 FROM public.fx_rates r WHERE r.currency = deposits.currency);

  UPDATE public.withdrawals
  SET currency = v_to, updated_at = now()
  WHERE user_id = v_uid
    AND EXISTS (SELECT 1 FROM public.fx_rates r WHERE r.currency = withdrawals.currency);

  UPDATE public.user_fees
  SET currency = v_to, updated_at = now()
  WHERE user_id = v_uid
    AND EXISTS (SELECT 1 FROM public.fx_rates r WHERE r.currency = user_fees.currency);

  RETURN jsonb_build_object(
    'ok', true,
    'from_currency', v_from,
    'to_currency', v_to,
    'balance', v_balance,
    'converted', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_user_currency(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_user_currency(text) TO authenticated;

-- Restore users who already lost balance to FX conversion.
-- Convert amounts back to USD units, then keep their preferred currency label.
DO $$
DECLARE
  r record;
  v_usd numeric;
  v_label text;
BEGIN
  FOR r IN
    SELECT b.user_id, b.currency, b.amount, COALESCE(p.preferred_currency, b.currency) AS preferred
    FROM public.balances b
    JOIN public.profiles p ON p.id = b.user_id
    WHERE b.currency IS DISTINCT FROM 'USD'
  LOOP
    v_usd := public.convert_currency_amount(r.amount, r.currency, 'USD');
    v_label := public.normalize_account_currency(r.preferred);

    UPDATE public.balances
    SET amount = v_usd, currency = v_label, updated_at = now()
    WHERE user_id = r.user_id;

    UPDATE public.deposits
    SET
      amount = public.convert_currency_amount(amount, currency, 'USD'),
      currency = v_label,
      updated_at = now()
    WHERE user_id = r.user_id
      AND EXISTS (SELECT 1 FROM public.fx_rates x WHERE x.currency = deposits.currency)
      AND currency IS DISTINCT FROM 'USD';

    UPDATE public.withdrawals
    SET
      amount = public.convert_currency_amount(amount, currency, 'USD'),
      currency = v_label,
      updated_at = now()
    WHERE user_id = r.user_id
      AND EXISTS (SELECT 1 FROM public.fx_rates x WHERE x.currency = withdrawals.currency)
      AND currency IS DISTINCT FROM 'USD';

    UPDATE public.user_fees
    SET
      amount = public.convert_currency_amount(amount, currency, 'USD'),
      currency = v_label,
      updated_at = now()
    WHERE user_id = r.user_id
      AND EXISTS (SELECT 1 FROM public.fx_rates x WHERE x.currency = user_fees.currency)
      AND currency IS DISTINCT FROM 'USD';

    UPDATE public.trades
    SET
      price = public.convert_currency_amount(price, r.currency, 'USD'),
      profit = public.convert_currency_amount(profit, r.currency, 'USD')
    WHERE user_id = r.user_id;

    UPDATE public.mining_packages
    SET
      investment = public.convert_currency_amount(investment, r.currency, 'USD'),
      accrued_profit = public.convert_currency_amount(accrued_profit, r.currency, 'USD')
    WHERE user_id = r.user_id;

    UPDATE public.signal_packages
    SET price = public.convert_currency_amount(price, r.currency, 'USD')
    WHERE user_id = r.user_id;

    UPDATE public.ai_trading_subscriptions
    SET
      allocation = public.convert_currency_amount(allocation, r.currency, 'USD'),
      profit_earned = public.convert_currency_amount(profit_earned, r.currency, 'USD'),
      purchase_cost = public.convert_currency_amount(COALESCE(purchase_cost, allocation), r.currency, 'USD')
    WHERE user_id = r.user_id;

    UPDATE public.copy_trading_subscriptions
    SET
      allocation = public.convert_currency_amount(allocation, r.currency, 'USD'),
      profit_earned = public.convert_currency_amount(COALESCE(profit_earned, 0), r.currency, 'USD')
    WHERE user_id = r.user_id;

    UPDATE public.ai_bot_trades
    SET
      trade_amount = public.convert_currency_amount(trade_amount, r.currency, 'USD'),
      profit = public.convert_currency_amount(profit, r.currency, 'USD')
    WHERE user_id = r.user_id;

    UPDATE public.trade_profit_credits
    SET
      amount = public.convert_currency_amount(amount, r.currency, 'USD'),
      balance_before = public.convert_currency_amount(balance_before, r.currency, 'USD'),
      balance_after = public.convert_currency_amount(balance_after, r.currency, 'USD')
    WHERE user_id = r.user_id;

    UPDATE public.admin_balance_adjustments
    SET
      amount = public.convert_currency_amount(amount, r.currency, 'USD'),
      balance_before = public.convert_currency_amount(balance_before, r.currency, 'USD'),
      balance_after = public.convert_currency_amount(balance_after, r.currency, 'USD')
    WHERE user_id = r.user_id;

    UPDATE public.copy_trading_profit_credits
    SET
      amount = public.convert_currency_amount(amount, r.currency, 'USD'),
      balance_before = public.convert_currency_amount(balance_before, r.currency, 'USD'),
      balance_after = public.convert_currency_amount(balance_after, r.currency, 'USD'),
      profit_before = public.convert_currency_amount(profit_before, r.currency, 'USD'),
      profit_after = public.convert_currency_amount(profit_after, r.currency, 'USD')
    WHERE user_id = r.user_id;

    UPDATE public.profiles
    SET preferred_currency = v_label, updated_at = now()
    WHERE id = r.user_id;
  END LOOP;
END;
$$;
