"use client";

import type { MarketPair } from "@/lib/market-data";
import { CryptoIcon } from "@/components/crypto/CryptoIcon";
import { spotAssetByPair } from "@/lib/spot-assets";
import { formatNumber, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";

type SpotMarketListProps = {
  pairs: MarketPair[];
  selectedSymbol: string;
  onSelect: (pair: MarketPair) => void;
  compact?: boolean;
};

export function SpotMarketList({
  pairs,
  selectedSymbol,
  onSelect,
  compact = false,
}: SpotMarketListProps) {
  if (compact) {
    return (
      <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-bg-secondary">
        {pairs.map((pair) => {
          const asset = spotAssetByPair(pair.symbol);
          const base = asset?.symbol ?? pair.symbol.split("/")[0];
          return (
            <button
              key={pair.symbol}
              type="button"
              onClick={() => onSelect(pair)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 text-[13px] border-b border-border last:border-0 cursor-pointer touch-target",
                selectedSymbol === pair.symbol && "bg-bg-hover"
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5 text-left">
                <CryptoIcon symbol={base} label={pair.name} size="sm" tile={false} />
                <div className="min-w-0">
                  <span className="font-medium block truncate">{base}</span>
                  <span className="text-[11px] text-text-tertiary truncate block">
                    {pair.name}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <span className="font-mono text-[12px] block">
                  ${formatNumber(pair.price, pair.price < 10 ? 4 : 2)}
                </span>
                <span
                  className={cn(
                    "font-mono text-[11px]",
                    pair.change24h >= 0 ? "text-green" : "text-red"
                  )}
                >
                  {formatPercent(pair.change24h)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-b-xl border-t border-border">
      <div className="grid grid-cols-[1.2fr_1fr_0.8fr] px-3 sm:px-4 py-2 text-[11px] uppercase tracking-wide text-text-tertiary bg-bg-primary">
        <span>Asset</span>
        <span className="text-right">Last</span>
        <span className="text-right">24h</span>
      </div>
      <div className="max-h-44 lg:max-h-52 overflow-y-auto">
        <table className="w-full">
          <tbody>
            {pairs.map((pair) => {
              const asset = spotAssetByPair(pair.symbol);
              const base = asset?.symbol ?? pair.symbol.split("/")[0];
              return (
                <tr
                  key={pair.symbol}
                  onClick={() => onSelect(pair)}
                  className={cn(
                    "market-row cursor-pointer text-[13px] border-t border-border/60",
                    selectedSymbol === pair.symbol && "bg-bg-hover"
                  )}
                >
                  <td className="px-3 sm:px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <CryptoIcon symbol={base} label={pair.name} size="sm" tile={false} />
                      <div>
                        <span className="font-medium block">{base}</span>
                        <span className="text-[11px] text-text-tertiary">{pair.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 text-right font-mono">
                    ${formatNumber(pair.price, pair.price < 10 ? 4 : 2)}
                  </td>
                  <td
                    className={cn(
                      "px-3 sm:px-4 py-2.5 text-right font-mono text-[11px]",
                      pair.change24h >= 0 ? "text-green" : "text-red"
                    )}
                  >
                    {formatPercent(pair.change24h)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
