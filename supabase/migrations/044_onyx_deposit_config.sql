-- Ensure deposit_config has usable crypto wallet addresses (replace via Admin → Settings)

UPDATE platform_settings
SET value = jsonb_set(
  COALESCE(value, '{}'::jsonb),
  '{cryptoWallets}',
  '{
    "bitcoin": "bc1qonyx7x8k2mdepositwallet9f4h2j",
    "ethereum": "0xOnyx742DepositWallet8a3f9c2e1b",
    "usdt": "0xOnyx742DepositWallet8a3f9c2e1b",
    "bnb": "0xOnyx742DepositWallet8a3f9c2e1b",
    "solana": "OnyxDep0s1tWa11etSo1ana9xK2m",
    "xrp": "rOnyxDepositWallet9XRP8k2m4n",
    "litecoin": "ltc1qonyxdepositwallet7k2m9x",
    "dogecoin": "DOnyxDepositWallet9DOGE2k"
  }'::jsonb,
  true
)
WHERE key = 'deposit_config'
  AND (
    value->'cryptoWallets' IS NULL
    OR value->'cryptoWallets' = '{}'::jsonb
    OR value::text ILIKE '%velion%'
  );

INSERT INTO platform_settings (key, value)
SELECT
  'deposit_config',
  '{
    "cryptoWallets": {
      "bitcoin": "bc1qonyx7x8k2mdepositwallet9f4h2j",
      "ethereum": "0xOnyx742DepositWallet8a3f9c2e1b",
      "usdt": "0xOnyx742DepositWallet8a3f9c2e1b",
      "bnb": "0xOnyx742DepositWallet8a3f9c2e1b",
      "solana": "OnyxDep0s1tWa11etSo1ana9xK2m",
      "xrp": "rOnyxDepositWallet9XRP8k2m4n",
      "litecoin": "ltc1qonyxdepositwallet7k2m9x",
      "dogecoin": "DOnyxDepositWallet9DOGE2k"
    },
    "cryptoPartners": [],
    "giftCardPartners": []
  }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM platform_settings WHERE key = 'deposit_config');
