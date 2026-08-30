/** Colored SVG icons from the spothq cryptocurrency-icons set (jsDelivr CDN). */
const CRYPTO_CDN =
  "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color";

const SYMBOL_SLUG: Record<string, string> = {
  BTC: "btc",
  ETH: "eth",
  USDT: "usdt",
  USDC: "usdc",
  SOL: "sol",
  BNB: "bnb",
  XRP: "xrp",
  DOGE: "doge",
  LTC: "ltc",
  ADA: "ada",
  bitcoin: "btc",
  ethereum: "eth",
  usdt: "usdt",
  bnb: "bnb",
  solana: "sol",
  xrp: "xrp",
  dogecoin: "doge",
  litecoin: "ltc",
};

export function cryptoIconUrl(symbolOrKey: string): string {
  const slug =
    SYMBOL_SLUG[symbolOrKey] ??
    SYMBOL_SLUG[symbolOrKey.toUpperCase()] ??
    symbolOrKey.toLowerCase();
  return `${CRYPTO_CDN}/${slug}.svg`;
}

export const EWALLET_ICON_URLS: Record<string, string> = {
  paypal: "https://cdn.simpleicons.org/paypal/003087",
  wise: "https://cdn.simpleicons.org/wise/163300",
  skrill: "https://cdn.simpleicons.org/skrill/872166",
  revolut: "https://cdn.simpleicons.org/revolut/191C1F",
  neteller: "https://cdn.simpleicons.org/neteller/83BA3B",
  payoneer: "https://cdn.simpleicons.org/payoneer/FF4800",
};
