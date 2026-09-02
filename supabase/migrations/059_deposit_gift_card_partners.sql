-- Ensure gift card purchase partners exist in deposit_config.

UPDATE platform_settings
SET value = jsonb_set(
  COALESCE(value, '{}'::jsonb),
  '{giftCardPartners}',
  COALESCE(
    NULLIF(value->'giftCardPartners', '[]'::jsonb),
    '[
      {
        "id": "raise",
        "name": "Raise",
        "descriptionKey": "deposits.partnerRaiseDesc",
        "url": "https://www.raise.com",
        "color": "#E31837",
        "tagKey": "deposits.partnerRecommended",
        "enabled": true
      },
      {
        "id": "gyft",
        "name": "Gyft",
        "descriptionKey": "deposits.partnerGyftDesc",
        "url": "https://www.gyft.com",
        "color": "#00A4E4",
        "enabled": true
      }
    ]'::jsonb
  ),
  true
)
WHERE key = 'deposit_config'
  AND (
    value->'giftCardPartners' IS NULL
    OR value->'giftCardPartners' = '[]'::jsonb
  );
