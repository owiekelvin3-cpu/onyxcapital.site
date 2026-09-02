-- Newbie / Bronze / Silver / Gold / Platinum signal packages.

CREATE OR REPLACE FUNCTION public.signal_tier_rank(p_tier text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(COALESCE(p_tier, ''))
    WHEN 'sovereign' THEN 7
    WHEN 'executive' THEN 6
    WHEN 'premier' THEN 5
    WHEN 'platinum' THEN 5
    WHEN 'gold' THEN 4
    WHEN 'institutional' THEN 4
    WHEN 'silver' THEN 3
    WHEN 'elite' THEN 3
    WHEN 'vip' THEN 3
    WHEN 'bronze' THEN 2
    WHEN 'professional' THEN 2
    WHEN 'pro' THEN 2
    WHEN 'newbie' THEN 1
    WHEN 'starter' THEN 1
    WHEN 'basic' THEN 1
    ELSE 0
  END;
$$;

ALTER TABLE public.trading_signals DROP CONSTRAINT IF EXISTS trading_signals_min_tier_check;
ALTER TABLE public.trading_signals
  ADD CONSTRAINT trading_signals_min_tier_check
  CHECK (min_tier IN (
    'basic', 'pro', 'vip',
    'starter', 'professional', 'elite', 'institutional',
    'premier', 'executive', 'sovereign',
    'newbie', 'bronze', 'silver', 'gold', 'platinum'
  ));
