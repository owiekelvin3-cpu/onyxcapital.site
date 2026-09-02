-- Persist signup state/region without IP sync overwriting user-entered country

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS region TEXT;

CREATE OR REPLACE FUNCTION sync_user_location(
  p_country TEXT,
  p_city TEXT,
  p_timezone TEXT,
  p_last_known_ip TEXT,
  p_last_known_location TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE profiles
  SET
    -- Keep user-provided country from signup; only fill if empty
    country = CASE
      WHEN COALESCE(TRIM(country), '') = '' THEN NULLIF(TRIM(p_country), '')
      ELSE country
    END,
    city = NULLIF(TRIM(p_city), ''),
    timezone = COALESCE(NULLIF(TRIM(p_timezone), ''), timezone),
    last_known_ip = NULLIF(TRIM(p_last_known_ip), ''),
    last_known_location = NULLIF(TRIM(p_last_known_location), ''),
    location_updated_at = NOW()
  WHERE id = auth.uid();
END;
$$;
