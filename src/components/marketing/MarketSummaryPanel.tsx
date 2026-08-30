import Link from "next/link";
import type { MarketPair } from "@/lib/market-data";
import { formatCompact, formatNumber, formatPercent } from "@/lib/utils";

export function MarketSummaryPanel({ pairs }: { pairs: MarketPair[] }) {
  const indices = pairs.slice(0, 4);
  const crypto = pairs.filter((p) => p.symbol.includes("/")).slice(0, 3);

  return (
    <section className="border-y border-border bg-bg-secondary py-10 sm:py-12">
      <div className="container-app">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-[18px] sm:text-[20px] font-bold text-text-primary">Market summary</h2>
          <Link href="/markets" className="text-[13px] font-medium text-brand hover:underline">
            See all markets
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-5">
          <div className="rounded-lg border border-border bg-bg-primary p-4 sm:p-5">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-text-tertiary mb-3">
              Major markets
            </p>
            <ul className="space-y-3">
              {indices.map((pair) => (
                <li key={pair.symbol} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-medium text-text-primary">{pair.name}</p>
                    <p className="text-[12px] text-text-tertiary">{pair.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-mono tabular-nums text-text-primary">
                      ${formatNumber(pair.price, pair.price < 10 ? 4 : 2)}
                    </p>
                    <p
                      className={`text-[12px] font-mono tabular-nums ${pair.change24h >= 0 ? "text-green" : "text-red"}`}
                    >
                      {formatPercent(pair.change24h)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-bg-primary p-4 sm:p-5">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-text-tertiary mb-3">
              Crypto
            </p>
            <ul className="space-y-3">
              {crypto.map((pair) => (
                <li key={pair.symbol} className="flex items-center justify-between gap-3">
                  <p className="text-[14px] font-medium text-text-primary">{pair.symbol}</p>
                  <div className="text-right">
                    <p className="text-[14px] font-mono tabular-nums">
                      ${formatNumber(pair.price, pair.price < 10 ? 4 : 2)}
                    </p>
                    <p
                      className={`text-[12px] font-mono ${pair.change24h >= 0 ? "text-green" : "text-red"}`}
                    >
                      {formatPercent(pair.change24h)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/markets" className="inline-block mt-4 text-[13px] text-brand hover:underline">
              See all crypto coins
            </Link>
          </div>

          <div className="rounded-lg border border-border bg-bg-primary p-4 sm:p-5">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-text-tertiary mb-3">
              Volume leaders
            </p>
            <ul className="space-y-3">
              {[...pairs]
                .sort((a, b) => b.volume24h - a.volume24h)
                .slice(0, 4)
                .map((pair) => (
                  <li key={pair.symbol} className="flex items-center justify-between gap-3">
                    <p className="text-[14px] font-medium text-text-primary truncate">{pair.symbol}</p>
                    <p className="text-[12px] text-text-tertiary shrink-0">
                      Vol {formatCompact(pair.volume24h)}
                    </p>
                  </li>
                ))}
            </ul>
            <Link href="/register" className="inline-block mt-4 text-[13px] text-brand hover:underline">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
