import Image from "next/image";
import type { MemeCoinRow } from "@/lib/meme-coins/types";
import { cn, formatCompact, formatPercent } from "@/lib/utils";

function sourceLabel(_coin: MemeCoinRow): string {
  return "Live";
}

function formatMemePrice(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  if (value >= 0.0001) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(8)}`;
}

export function MemeCoinCard({ coin }: { coin: MemeCoinRow }) {
  const change = coin.change_24h ?? 0;
  const positive = change >= 0;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-bg-secondary p-4 transition-all hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5 sm:p-5",
        coin.featured && "ring-1 ring-brand/30"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-bg-primary">
          {coin.image_url ? (
            <Image
              src={coin.image_url}
              alt={coin.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-bold text-brand">
              {coin.symbol.slice(0, 2)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-text-primary">{coin.name}</h3>
            {coin.featured ? (
              <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                Featured
              </span>
            ) : null}
          </div>
          <p className="text-sm font-medium text-text-tertiary">${coin.symbol}</p>
        </div>

        <div className="text-right">
          <p className="text-sm font-semibold text-text-primary">{formatMemePrice(coin.price_usd)}</p>
          <p
            className={cn(
              "text-xs font-semibold",
              positive ? "text-green" : "text-red"
            )}
          >
            {coin.change_24h != null ? formatPercent(change) : "—"}
          </p>
        </div>
      </div>

      {coin.description ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-text-secondary">
          {coin.description}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
            "bg-brand/10 text-brand"
          )}
        >
          {sourceLabel(coin)}
        </span>
        {coin.market_cap_usd != null ? (
          <span className="text-[11px] text-text-tertiary">
            MCap {formatCompact(coin.market_cap_usd)}
          </span>
        ) : null}
        {coin.tags?.slice(0, 2).map((tag) => (
          <span key={tag} className="text-[11px] text-text-tertiary">
            #{tag}
          </span>
        ))}
      </div>
    </article>
  );
}

export function MemeCoinGrid({ coins }: { coins: MemeCoinRow[] }) {
  if (coins.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-bg-secondary/50 px-6 py-16 text-center">
        <p className="text-base font-semibold text-text-primary">Today&apos;s picks are loading</p>
        <p className="mt-2 text-sm text-text-secondary">
          The daily meme coin feed refreshes automatically. Check back soon or ask an admin to run sync.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {coins.map((coin) => (
        <MemeCoinCard key={coin.id} coin={coin} />
      ))}
    </div>
  );
}
