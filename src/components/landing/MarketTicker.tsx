"use client";

import type { MarketPair } from "@/lib/market-data";
import { MARKET_PAIRS } from "@/lib/market-data";
import { formatNumber, formatPercent } from "@/lib/utils";

export function MarketTicker({ pairs = MARKET_PAIRS }: { pairs?: MarketPair[] }) {
  const ticker = pairs.slice(0, 8);
  const items = [...ticker, ...ticker];

  return (
    <div className="relative bg-bg-secondary border-y border-border overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-20 z-10 bg-gradient-to-r from-bg-secondary to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-20 z-10 bg-gradient-to-l from-bg-secondary to-transparent" />

      <div className="flex marquee-track whitespace-nowrap py-2.5">
        {items.map((pair, i) => (
          <div
            key={`${pair.symbol}-${i}`}
            className="inline-flex items-center gap-2.5 px-5 text-xs group"
          >
            <span className="font-medium text-text-primary group-hover:text-brand transition-colors">
              {pair.symbol}
            </span>
            <span className="font-mono text-text-secondary tabular-nums">
              ${formatNumber(pair.price, pair.price < 10 ? 4 : 2)}
            </span>
            <span
              className={`font-mono tabular-nums ${pair.change24h >= 0 ? "text-green" : "text-red"}`}
            >
              {formatPercent(pair.change24h)}
            </span>
            <span className="text-border-light mx-1" aria-hidden>
              ·
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
