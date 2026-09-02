-- Users can stop copying a trader (status -> cancelled) and recopy later.

DROP POLICY IF EXISTS "Users can update own copy subs" ON public.copy_trading_subscriptions;
CREATE POLICY "Users can update own copy subs" ON public.copy_trading_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE OR REPLACE FUNCTION public.uncopy_trader(p_trader_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_name text := trim(COALESCE(p_trader_name, ''));
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF char_length(v_name) < 2 THEN
    RAISE EXCEPTION 'Trader name is required';
  END IF;

  UPDATE public.copy_trading_subscriptions
  SET status = 'cancelled'
  WHERE user_id = v_uid
    AND trader_name = v_name
    AND status = 'active'
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'You are not copying this trader';
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'trader_name', v_name, 'status', 'cancelled');
END;
$$;

REVOKE ALL ON FUNCTION public.uncopy_trader(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.uncopy_trader(text) TO authenticated;
