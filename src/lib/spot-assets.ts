import type { MarketPair } from "@/lib/market-data";

export type SpotAsset = {
  symbol: string;
  name: string;
  depositKey: string;
  pairSymbol: string;
  coingeckoId: string;
};

/** Spot desk supports these assets only (matches crypto deposit options). */
export const SPOT_ASSETS: SpotAsset[] = [
  { symbol: "BTC", name: "Bitcoin", depositKey: "bitcoin", pairSymbol: "BTC/USDT", coingeckoId: "bitcoin" },
  { symbol: "ETH", name: "Ethereum", depositKey: "ethereum", pairSymbol: "ETH/USDT", coingeckoId: "ethereum" },
  { symbol: "USDT", name: "Tether", depositKey: "usdt", pairSymbol: "USDT/USD", coingeckoId: "tether" },
  { symbol: "BNB", name: "BNB", depositKey: "bnb", pairSymbol: "BNB/USDT", coingeckoId: "binancecoin" },
  { symbol: "SOL", name: "Solana", depositKey: "solana", pairSymbol: "SOL/USDT", coingeckoId: "solana" },
  { symbol: "XRP", name: "XRP", depositKey: "xrp", pairSymbol: "XRP/USDT", coingeckoId: "ripple" },
  { symbol: "DOGE", name: "Dogecoin", depositKey: "dogecoin", pairSymbol: "DOGE/USDT", coingeckoId: "dogecoin" },
  { symbol: "LTC", name: "Litecoin", depositKey: "litecoin", pairSymbol: "LTC/USDT", coingeckoId: "litecoin" },
];

export const SPOT_PAIR_SYMBOLS = new Set(SPOT_ASSETS.map((a) => a.pairSymbol));

export const SPOT_DEPOSIT_METHOD_ASSET: Record<string, string> = Object.fromEntries(
  SPOT_ASSETS.map((a) => [`crypto_${a.depositKey}`, a.symbol])
);

export function spotAssetBySymbol(symbol: string): SpotAsset | undefined {
  return SPOT_ASSETS.find((a) => a.symbol === symbol.toUpperCase());
}

export function spotAssetByPair(pairSymbol: string): SpotAsset | undefined {
  return SPOT_ASSETS.find((a) => a.pairSymbol === pairSymbol);
}

export function filterSpotMarketPairs(pairs: MarketPair[]): MarketPair[] {
  const bySymbol = new Map(pairs.map((p) => [p.symbol, p]));
  return SPOT_ASSETS.map((asset) => {
    const live = bySymbol.get(asset.pairSymbol);
    if (live) return { ...live, name: asset.name, category: "crypto" as const };
    return {
      symbol: asset.pairSymbol,
      name: asset.name,
      price: asset.symbol === "USDT" ? 1 : 0,
      change24h: 0,
      volume24h: 0,
      category: "crypto" as const,
    };
  }).filter((p) => p.price > 0 || p.symbol === "USDT/USD");
}

export function cryptoDepositPath(depositKey: string, fromTrade = true) {
  const params = new URLSearchParams({ asset: depositKey });
  if (fromTrade) params.set("from", "trade");
  return `/dashboard/deposit/crypto?${params.toString()}`;
}
