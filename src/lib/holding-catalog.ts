import type { MarketPair } from "@/lib/market-data";
import { MARKET_PAIRS } from "@/lib/market-data";
import type { HoldingRow } from "@/lib/supabase/types";

export type HoldingCatalogItem = {
  ticker: string;
  name: string;
  pairSymbol: string;
  category: MarketPair["category"];
};

/** Default rows shown on Holdings, including zero balances (matches the desk layout). */
export const FEATURED_HOLDINGS: HoldingCatalogItem[] = [
  { ticker: "BTC", name: "Bitcoin", pairSymbol: "BTC/USDT", category: "crypto" },
  { ticker: "ETH", name: "Ethereum", pairSymbol: "ETH/USDT", category: "crypto" },
  { ticker: "AAPL", name: "Apple", pairSymbol: "AAPL", category: "stock" },
  { ticker: "MSFT", name: "Microsoft", pairSymbol: "MSFT", category: "stock" },
];

export type HoldingDisplayRow = HoldingCatalogItem & {
  quantity: number;
  price: number;
  value: number;
  change24h: number;
};

export function tickerFromPair(symbol: string) {
  return symbol.split("/")[0].toUpperCase();
}

export function shortHoldingName(name: string) {
  return name.replace(/\s+(Inc\.?|Corp\.?)$/i, "").trim();
}

export function pairForTicker(ticker: string, pairs: MarketPair[]): MarketPair | undefined {
  const upper = ticker.toUpperCase();
  return (
    pairs.find((p) => p.symbol.toUpperCase() === upper) ??
    pairs.find((p) => tickerFromPair(p.symbol) === upper)
  );
}

export function catalogFromPairs(pairs: MarketPair[]): HoldingCatalogItem[] {
  return pairs.map((pair) => ({
    ticker: tickerFromPair(pair.symbol),
    name: pair.name,
    pairSymbol: pair.symbol,
    category: pair.category,
  }));
}

export function buildHoldingRows(
  catalog: HoldingCatalogItem[],
  holdings: HoldingRow[],
  pairs: MarketPair[]
): HoldingDisplayRow[] {
  const qtyByTicker = new Map<string, number>();
  for (const row of holdings) {
    const ticker = row.asset.split("/")[0].toUpperCase();
    qtyByTicker.set(ticker, (qtyByTicker.get(ticker) ?? 0) + Number(row.quantity ?? 0));
  }

  const seen = new Set<string>();
  const rows: HoldingDisplayRow[] = [];

  for (const item of catalog) {
    const pair = pairs.find((p) => p.symbol === item.pairSymbol) ?? pairForTicker(item.ticker, pairs);
    const quantity = qtyByTicker.get(item.ticker) ?? 0;
    seen.add(item.ticker);
    rows.push({
      ...item,
      name: shortHoldingName(pair?.name ?? item.name),
      category: pair?.category ?? item.category,
      quantity,
      price: pair?.price ?? 0,
      value: quantity * (pair?.price ?? 0),
      change24h: pair?.change24h ?? 0,
    });
  }

  for (const [ticker, quantity] of qtyByTicker) {
    if (seen.has(ticker) || quantity <= 0) continue;
    const pair = pairForTicker(ticker, pairs);
    const fallback = MARKET_PAIRS.find((p) => tickerFromPair(p.symbol) === ticker);
    const price = pair?.price ?? fallback?.price ?? 0;
    rows.push({
      ticker,
      name: shortHoldingName(pair?.name ?? fallback?.name ?? ticker),
      pairSymbol: pair?.symbol ?? fallback?.symbol ?? ticker,
      category: pair?.category ?? fallback?.category ?? "crypto",
      quantity,
      price,
      value: quantity * price,
      change24h: pair?.change24h ?? fallback?.change24h ?? 0,
    });
  }

  return rows;
}
