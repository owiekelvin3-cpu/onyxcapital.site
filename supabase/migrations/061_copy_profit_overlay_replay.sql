-- Replay copy-trading profit overlay when the user next opens the dashboard.

ALTER TABLE public.copy_trading_profit_credits
  ADD COLUMN IF NOT EXISTS overlay_shown_at timestamptz;

ALTER TABLE public.copy_trading_profit_credits REPLICA IDENTITY FULL;

-- Existing credits were already delivered (or skipped). Only new unseen profits replay.
UPDATE public.copy_trading_profit_credits
SET overlay_shown_at = created_at
WHERE overlay_shown_at IS NULL;

CREATE INDEX IF NOT EXISTS copy_trading_profit_credits_overlay_pending_idx
  ON public.copy_trading_profit_credits (user_id, created_at)
  WHERE overlay_shown_at IS NULL AND amount > 0;

CREATE OR REPLACE FUNCTION public.mark_copy_profit_overlay_shown(p_credit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_credit_id IS NULL THEN
    RAISE EXCEPTION 'Credit is required';
  END IF;

  UPDATE public.copy_trading_profit_credits
  SET overlay_shown_at = now()
  WHERE id = p_credit_id
    AND user_id = v_user_id
    AND overlay_shown_at IS NULL;

  RETURN jsonb_build_object('ok', true, 'credit_id', p_credit_id);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_copy_profit_overlay_shown(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_copy_profit_overlay_shown(uuid) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'copy_trading_profit_credits'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.copy_trading_profit_credits;
  END IF;
END
$$;
