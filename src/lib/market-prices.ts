import { getCachedLiveMarketPairs, priceFromPairs } from "@/lib/live-prices";
import { MARKET_PAIRS } from "@/lib/market-data";

/** Server-side price lookup with live crypto feed */
export async function priceForAsset(asset: string): Promise<number> {
  const pairs = await getCachedLiveMarketPairs();
  const price = priceFromPairs(pairs, asset);
  if (price > 0) return price;

  const fallback = MARKET_PAIRS.find((p) =>
    p.symbol.toUpperCase().startsWith(`${asset.toUpperCase()}/`)
  );
  return fallback?.price ?? 0;
}

/** Sync fallback for client-side before live fetch completes */
export function priceForAssetSync(asset: string): number {
  const upper = asset.toUpperCase();
  const pair = MARKET_PAIRS.find(
    (p) =>
      p.symbol.toUpperCase().startsWith(`${upper}/`) ||
      p.symbol.toUpperCase() === upper
  );
  return pair?.price ?? 0;
}
