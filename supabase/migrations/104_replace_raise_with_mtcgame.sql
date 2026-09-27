-- Replace Raise with MTC Game in deposit gift-card partner links.

UPDATE platform_settings
SET value = jsonb_set(
  value,
  '{giftCardPartners}',
  (
    SELECT COALESCE(jsonb_agg(partner), '[]'::jsonb)
    FROM (
      SELECT
        CASE
          WHEN partner->>'id' = 'raise'
            OR coalesce(partner->>'url', '') ILIKE '%raise.com%'
          THEN '{
            "id": "mtcgame",
            "name": "MTC Game",
            "descriptionKey": "deposits.partnerMtcGameDesc",
            "url": "https://www.mtcgame.com",
            "color": "#C41E3A",
            "tagKey": "deposits.partnerRecommended",
            "enabled": true
          }'::jsonb
          ELSE partner
        END AS partner
      FROM jsonb_array_elements(COALESCE(value->'giftCardPartners', '[]'::jsonb)) AS partner
    ) mapped
  )
)
WHERE key = 'deposit_config';
