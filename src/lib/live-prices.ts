import { unstable_cache } from "next/cache";
import { SPOT_ASSETS } from "@/lib/spot-assets";
import { MARKET_PAIRS, type MarketPair } from "@/lib/market-data";

const COINGECKO_BY_PAIR = Object.fromEntries(
  SPOT_ASSETS.map((a) => [a.pairSymbol, a.coingeckoId])
) as Record<string, string>;

/** Legacy + marketing pairs still use this map */
const COINGECKO_IDS: Record<string, string> = {
  "BTC/USDT": "bitcoin",
  "ETH/USDT": "ethereum",
  "SOL/USDT": "solana",
  "BNB/USDT": "binancecoin",
  "XRP/USDT": "ripple",
  "DOGE/USDT": "dogecoin",
  "LTC/USDT": "litecoin",
  "USDT/USD": "tether",
  "ADA/USDT": "cardano",
  ...COINGECKO_BY_PAIR,
};

type CoinGeckoRow = { usd: number; usd_24h_change?: number };

async function fetchCoinGecko(): Promise<Record<string, CoinGeckoRow>> {
  const ids = [...new Set(Object.values(COINGECKO_IDS))].join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
    { next: { revalidate: 60 } }
  );

  if (!res.ok) {
    throw new Error(`CoinGecko ${res.status}`);
  }

  return res.json();
}

function mergePrices(cg: Record<string, CoinGeckoRow>): MarketPair[] {
  return MARKET_PAIRS.map((pair) => {
    const id = COINGECKO_IDS[pair.symbol];
    const live = id ? cg[id] : undefined;

    if (!live?.usd) return pair;

    return {
      ...pair,
      price: live.usd,
      change24h: live.usd_24h_change ?? pair.change24h,
    };
  });
}

export async function getLiveMarketPairs(): Promise<MarketPair[]> {
  try {
    const cg = await fetchCoinGecko();
    return mergePrices(cg);
  } catch {
    return MARKET_PAIRS;
  }
}

export const getCachedLiveMarketPairs = unstable_cache(
  getLiveMarketPairs,
  ["live-market-pairs"],
  { revalidate: 60 }
);

export function priceFromPairs(pairs: MarketPair[], asset: string): number {
  const upper = asset.toUpperCase();
  const pair = pairs.find(
    (p) =>
      p.symbol.toUpperCase().startsWith(`${upper}/`) ||
      p.symbol.toUpperCase() === upper
  );
  return pair?.price ?? 0;
}
