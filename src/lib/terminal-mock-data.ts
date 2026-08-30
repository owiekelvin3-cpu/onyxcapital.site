import type { MarketPair } from "@/lib/market-data";

export type OrderBookRow = {
  price: number;
  amount: number;
  total: number;
  side: "buy" | "sell";
};

export type MarketTradeRow = {
  price: number;
  amount: number;
  total: number;
  side: "buy" | "sell";
  time: string;
};

function pseudoRandom(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function buildOrderBook(midPrice: number, symbol: string): OrderBookRow[] {
  const base = symbol.split("/")[0];
  const step = midPrice < 10 ? 0.0001 : midPrice < 1000 ? 0.01 : 1;
  const rows: OrderBookRow[] = [];

  for (let i = 8; i >= 1; i--) {
    const amount = Number((pseudoRandom(i + midPrice) * 2.5 + 0.08).toFixed(4));
    const price = midPrice + step * i * 1.2;
    rows.push({
      price,
      amount,
      total: price * amount,
      side: "sell",
    });
  }

  for (let i = 1; i <= 8; i++) {
    const amount = Number((pseudoRandom(i + midPrice + 20) * 2.2 + 0.1).toFixed(4));
    const price = midPrice - step * i * 1.2;
    rows.push({
      price,
      amount,
      total: price * amount,
      side: "buy",
    });
  }

  void base;
  return rows;
}

export function buildMarketTrades(midPrice: number): MarketTradeRow[] {
  const now = Date.now();
  return Array.from({ length: 12 }, (_, i) => {
    const side: "buy" | "sell" = i % 3 === 0 ? "sell" : "buy";
    const drift = (pseudoRandom(i + midPrice) - 0.5) * midPrice * 0.0008;
    const price = midPrice + drift;
    const amount = Number((pseudoRandom(i * 3) * 1.8 + 0.02).toFixed(4));
    const d = new Date(now - i * 47_000);
    return {
      price,
      amount,
      total: price * amount,
      side,
      time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
  });
}

export function pairHighLow(pair: MarketPair) {
  const swing = Math.max(Math.abs(pair.change24h), 0.5) / 100;
  return {
    high: pair.price * (1 + swing * 0.65),
    low: pair.price * (1 - swing * 0.55),
  };
}

export function formatPairVolume(pair: MarketPair) {
  const base = pair.symbol.split("/")[0];
  const quote = pair.symbol.includes("/") ? pair.symbol.split("/")[1] : "USD";
  const baseVol = pair.volume24h / Math.max(pair.price, 1);
  return {
    base: `${Math.round(baseVol).toLocaleString()} ${base}`,
    quote: `${(pair.volume24h / 1_000_000).toFixed(3)}M ${quote}`,
  };
}
