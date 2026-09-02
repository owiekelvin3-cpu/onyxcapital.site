-- Add premier ($10k), executive ($15k), and sovereign ($20k) signal tiers.

CREATE OR REPLACE FUNCTION public.signal_tier_rank(p_tier text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(COALESCE(p_tier, ''))
    WHEN 'sovereign' THEN 7
    WHEN 'executive' THEN 6
    WHEN 'premier' THEN 5
    WHEN 'institutional' THEN 4
    WHEN 'elite' THEN 3
    WHEN 'vip' THEN 3
    WHEN 'professional' THEN 2
    WHEN 'pro' THEN 2
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
    'premier', 'executive', 'sovereign'
  ));
