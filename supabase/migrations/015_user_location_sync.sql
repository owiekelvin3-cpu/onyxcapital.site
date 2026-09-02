-- Auto-track user location on dashboard visits

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

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
    country = NULLIF(TRIM(p_country), ''),
    city = NULLIF(TRIM(p_city), ''),
    timezone = NULLIF(TRIM(p_timezone), ''),
    last_known_ip = NULLIF(TRIM(p_last_known_ip), ''),
    last_known_location = NULLIF(TRIM(p_last_known_location), ''),
    location_updated_at = NOW()
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION sync_user_location(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sync_user_location(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
