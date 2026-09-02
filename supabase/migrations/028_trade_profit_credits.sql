-- Admin-credited trading profit on spot fills

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS profit numeric(18, 2) NOT NULL DEFAULT 0
    CHECK (profit >= 0);

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS profit_note text;

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS profit_updated_at timestamptz;

CREATE TABLE IF NOT EXISTS public.trade_profit_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(18, 2) NOT NULL CHECK (amount > 0),
  note text,
  balance_before numeric(18, 2) NOT NULL,
  balance_after numeric(18, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trade_profit_credits_user_id_idx
  ON public.trade_profit_credits (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS trade_profit_credits_trade_id_idx
  ON public.trade_profit_credits (trade_id, created_at DESC);

ALTER TABLE public.trade_profit_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own trade profit credits" ON public.trade_profit_credits;
CREATE POLICY "Users can view own trade profit credits" ON public.trade_profit_credits
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage trade profit credits" ON public.trade_profit_credits;
CREATE POLICY "Admins can manage trade profit credits" ON public.trade_profit_credits
  FOR ALL USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_add_trade_profit(
  p_trade_id uuid,
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
  v_trade public.trades%ROWTYPE;
  v_before numeric(18, 2);
  v_after numeric(18, 2);
  v_credit public.trade_profit_credits%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Profit amount must be greater than zero';
  END IF;

  v_amount := round(p_amount, 2);

  SELECT * INTO v_trade
  FROM public.trades
  WHERE id = p_trade_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade not found';
  END IF;

  IF v_trade.status NOT IN ('completed', 'approved') THEN
    RAISE EXCEPTION 'Profit can only be added to completed trades';
  END IF;

  IF v_admin_id = v_trade.user_id THEN
    RAISE EXCEPTION 'You cannot credit profit on your own trade';
  END IF;

  INSERT INTO public.balances (user_id, currency, amount)
  VALUES (v_trade.user_id, 'USD', 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT amount INTO v_before
  FROM public.balances
  WHERE user_id = v_trade.user_id
  FOR UPDATE;

  v_before := COALESCE(v_before, 0);
  v_after := v_before + v_amount;

  UPDATE public.balances
  SET amount = v_after,
      updated_at = now()
  WHERE user_id = v_trade.user_id;

  UPDATE public.trades
  SET profit = COALESCE(profit, 0) + v_amount,
      profit_note = COALESCE(v_note, profit_note),
      profit_updated_at = now()
  WHERE id = v_trade.id;

  INSERT INTO public.trade_profit_credits (
    trade_id, user_id, admin_id, amount, note, balance_before, balance_after
  )
  VALUES (
    v_trade.id, v_trade.user_id, v_admin_id, v_amount, v_note, v_before, v_after
  )
  RETURNING * INTO v_credit;

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    v_trade.user_id,
    'Trading profit credited',
    'A profit of ' || v_amount::text || ' USD was added to your balance from your '
      || upper(v_trade.type) || ' ' || v_trade.asset || ' trade.'
      || CASE WHEN v_note IS NOT NULL THEN ' Note: ' || v_note ELSE '' END
  );

  RETURN jsonb_build_object(
    'ok', true,
    'credit_id', v_credit.id,
    'trade_id', v_trade.id,
    'user_id', v_trade.user_id,
    'amount', v_amount,
    'trade_profit_total', COALESCE(v_trade.profit, 0) + v_amount,
    'balance_before', v_before,
    'balance_after', v_after,
    'note', v_note,
    'created_at', v_credit.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_add_trade_profit(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_add_trade_profit(uuid, numeric, text) TO authenticated;
