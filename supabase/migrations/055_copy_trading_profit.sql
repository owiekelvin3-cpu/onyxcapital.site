-- Admin copy-trading profit: credits balance, tracks subscription P/L, notifies user for live overlay.

ALTER TABLE public.copy_trading_subscriptions
  ADD COLUMN IF NOT EXISTS profit_earned numeric(18, 2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.copy_trading_profit_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.copy_trading_subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trader_name text NOT NULL,
  amount numeric(18, 2) NOT NULL CHECK (amount <> 0),
  note text,
  balance_before numeric(18, 2) NOT NULL,
  balance_after numeric(18, 2) NOT NULL,
  profit_before numeric(18, 2) NOT NULL,
  profit_after numeric(18, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS copy_trading_profit_credits_user_id_idx
  ON public.copy_trading_profit_credits (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS copy_trading_profit_credits_subscription_id_idx
  ON public.copy_trading_profit_credits (subscription_id, created_at DESC);

ALTER TABLE public.copy_trading_profit_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own copy profit credits" ON public.copy_trading_profit_credits;
CREATE POLICY "Users can view own copy profit credits" ON public.copy_trading_profit_credits
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage copy profit credits" ON public.copy_trading_profit_credits;
CREATE POLICY "Admins can manage copy profit credits" ON public.copy_trading_profit_credits
  FOR ALL USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_adjust_copy_trading_profit(
  p_subscription_id uuid,
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
  v_sub public.copy_trading_subscriptions%ROWTYPE;
  v_balance_before numeric(18, 2);
  v_balance_after numeric(18, 2);
  v_profit_before numeric(18, 2);
  v_profit_after numeric(18, 2);
  v_row public.copy_trading_profit_credits%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Amount must be a non-zero profit or loss';
  END IF;

  v_amount := round(p_amount, 2);

  SELECT * INTO v_sub
  FROM public.copy_trading_subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Copy subscription not found';
  END IF;

  IF v_sub.status <> 'active' THEN
    RAISE EXCEPTION 'Profit can only be adjusted on active copy subscriptions';
  END IF;

  IF v_admin_id = v_sub.user_id THEN
    RAISE EXCEPTION 'You cannot adjust copy profit on your own account';
  END IF;

  INSERT INTO public.balances (user_id, currency, amount)
  VALUES (v_sub.user_id, 'USD', 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT amount INTO v_balance_before
  FROM public.balances
  WHERE user_id = v_sub.user_id
  FOR UPDATE;

  v_balance_before := COALESCE(v_balance_before, 0);
  v_balance_after := v_balance_before + v_amount;

  IF v_balance_after < 0 THEN
    RAISE EXCEPTION 'Insufficient balance for this copy trading loss';
  END IF;

  v_profit_before := COALESCE(v_sub.profit_earned, 0);
  v_profit_after := round(v_profit_before + v_amount, 2);

  UPDATE public.balances
  SET amount = v_balance_after,
      updated_at = now()
  WHERE user_id = v_sub.user_id;

  UPDATE public.copy_trading_subscriptions
  SET profit_earned = v_profit_after
  WHERE id = v_sub.id;

  INSERT INTO public.copy_trading_profit_credits (
    subscription_id,
    user_id,
    admin_id,
    trader_name,
    amount,
    note,
    balance_before,
    balance_after,
    profit_before,
    profit_after
  )
  VALUES (
    v_sub.id,
    v_sub.user_id,
    v_admin_id,
    v_sub.trader_name,
    v_amount,
    v_note,
    v_balance_before,
    v_balance_after,
    v_profit_before,
    v_profit_after
  )
  RETURNING * INTO v_row;

  IF v_amount > 0 THEN
    PERFORM create_notification(
      v_sub.user_id,
      'Copy trading profit',
      v_sub.trader_name || ' copied a winning trade — +' || format_usd_amount(v_amount) ||
      ' added to your balance. Copy P/L: ' || format_usd_amount(v_profit_after) || '.'
      || CASE WHEN v_note IS NOT NULL THEN ' Note: ' || v_note ELSE '' END
    );
  ELSE
    PERFORM create_notification(
      v_sub.user_id,
      'Copy trading loss',
      v_sub.trader_name || ' recorded a copied trade loss of ' || format_usd_amount(abs(v_amount)) ||
      '. Copy P/L: ' || format_usd_amount(v_profit_after) || '.'
      || CASE WHEN v_note IS NOT NULL THEN ' Note: ' || v_note ELSE '' END
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'credit_id', v_row.id,
    'subscription_id', v_sub.id,
    'user_id', v_sub.user_id,
    'trader_name', v_sub.trader_name,
    'amount', v_amount,
    'profit_before', v_profit_before,
    'profit_after', v_profit_after,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'note', v_note,
    'created_at', v_row.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_copy_trading_profit(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_copy_trading_profit(uuid, numeric, text) TO authenticated;
