-- Admin-controlled meme coin price/profit overrides

ALTER TABLE public.daily_meme_coins
  ADD COLUMN IF NOT EXISTS admin_price_locked boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.meme_coin_price_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meme_coin_id uuid NOT NULL REFERENCES public.daily_meme_coins(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  previous_price_usd numeric(24, 12),
  new_price_usd numeric(24, 12),
  previous_change_24h numeric(10, 4),
  new_change_24h numeric(10, 4),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meme_coin_price_adjustments_coin_idx
  ON public.meme_coin_price_adjustments (meme_coin_id, created_at DESC);

ALTER TABLE public.meme_coin_price_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage meme coin price adjustments" ON public.meme_coin_price_adjustments;
CREATE POLICY "Admins manage meme coin price adjustments" ON public.meme_coin_price_adjustments
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_adjust_meme_coin_profit(
  p_meme_coin_id uuid,
  p_price_usd numeric,
  p_change_24h numeric,
  p_lock boolean DEFAULT true,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_row public.daily_meme_coins%ROWTYPE;
  v_note text := nullif(trim(COALESCE(p_note, '')), '');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_meme_coin_id IS NULL THEN
    RAISE EXCEPTION 'Meme coin is required';
  END IF;

  IF p_price_usd IS NULL OR p_price_usd <= 0 THEN
    RAISE EXCEPTION 'Price must be greater than zero';
  END IF;

  IF p_change_24h IS NULL THEN
    RAISE EXCEPTION '24h profit change is required';
  END IF;

  SELECT * INTO v_row
  FROM public.daily_meme_coins
  WHERE id = p_meme_coin_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meme coin not found';
  END IF;

  INSERT INTO public.meme_coin_price_adjustments (
    meme_coin_id,
    admin_id,
    previous_price_usd,
    new_price_usd,
    previous_change_24h,
    new_change_24h,
    note
  ) VALUES (
    p_meme_coin_id,
    v_admin_id,
    v_row.price_usd,
    round(p_price_usd, 12),
    v_row.change_24h,
    round(p_change_24h, 4),
    v_note
  );

  UPDATE public.daily_meme_coins
  SET
    price_usd = round(p_price_usd, 12),
    change_24h = round(p_change_24h, 4),
    admin_price_locked = COALESCE(p_lock, true),
    updated_at = now()
  WHERE id = p_meme_coin_id;

  RETURN jsonb_build_object(
    'ok', true,
    'meme_coin_id', p_meme_coin_id,
    'symbol', v_row.symbol,
    'price_usd', round(p_price_usd, 12),
    'change_24h', round(p_change_24h, 4),
    'admin_price_locked', COALESCE(p_lock, true)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_meme_coin_profit(uuid, numeric, numeric, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_meme_coin_profit(uuid, numeric, numeric, boolean, text) TO authenticated;
