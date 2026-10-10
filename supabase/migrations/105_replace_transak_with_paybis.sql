-- Replace Transak with Paybis in deposit crypto partner links.

UPDATE platform_settings
SET value = jsonb_set(
  value,
  '{cryptoPartners}',
  (
    SELECT COALESCE(jsonb_agg(partner), '[]'::jsonb)
    FROM (
      SELECT
        CASE
          WHEN partner->>'id' = 'transak'
            OR coalesce(partner->>'url', '') ILIKE '%transak.com%'
          THEN '{
            "id": "paybis",
            "name": "Paybis",
            "descriptionKey": "deposits.partnerPaybisDesc",
            "url": "https://paybis.com/",
            "color": "#00C389",
            "enabled": true
          }'::jsonb
          ELSE partner
        END AS partner
      FROM jsonb_array_elements(COALESCE(value->'cryptoPartners', '[]'::jsonb)) AS partner
    ) mapped
  )
)
WHERE key = 'deposit_config';
