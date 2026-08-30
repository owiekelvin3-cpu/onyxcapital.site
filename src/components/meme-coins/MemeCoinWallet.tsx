"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2 } from "@/components/icons";
import type { MemeCoinRow } from "@/lib/meme-coins/types";
import type { MemeWalletItem } from "@/lib/api/meme-trading";
import type { LiveMemeCoin } from "@/hooks/useLiveMemeCoins";
import { cn, formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export type MemeWalletTab = "bag" | "market" | "trade";

function formatMemePrice(value: number): string {
  if (value >= 1) return formatCurrency(value);
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  if (value >= 0.0001) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(8)}`;
}

const SOURCE_LABEL: Record<MemeCoinRow["source"], string> = {
  trending: "Live",
  northline_generated: "Live",
  admin_manual: "Live",
};

function priceFlashClass(direction?: "up" | "down" | "flat"): string {
  if (direction === "up") return "text-green animate-pulse";
  if (direction === "down") return "text-red animate-pulse";
  return "text-text-primary";
}

export function MemeCoinOrderPanel({
  coin,
  side,
  onSideChange,
  amount,
  onAmountChange,
  total,
  cashBalance,
  heldQuantity,
  loading,
  error,
  success,
  onSubmit,
}: {
  coin: MemeCoinRow | LiveMemeCoin;
  side: "buy" | "sell";
  onSideChange: (side: "buy" | "sell") => void;
  amount: string;
  onAmountChange: (value: string) => void;
  total: number;
  cashBalance: number | null;
  heldQuantity: number;
  loading: boolean;
  error: string;
  success: string;
  onSubmit: () => void;
}) {
  const liveCoin = coin as LiveMemeCoin;
  const price = liveCoin.livePriceUsd ?? Number(coin.price_usd ?? 0);
  const direction = liveCoin.priceDirection;
  const maxBuyQty = price > 0 && cashBalance !== null ? cashBalance / price : 0;

  function setMax(fraction: number) {
    if (side === "buy") {
      const max = maxBuyQty * fraction;
      onAmountChange(max > 0 ? max.toFixed(max < 1 ? 6 : 4) : "");
      return;
    }
    const max = heldQuantity * fraction;
    onAmountChange(max > 0 ? max.toFixed(max < 1 ? 6 : 4) : "");
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-border bg-bg-primary">
          {coin.image_url ? (
            <Image src={coin.image_url} alt={coin.name} fill className="object-cover" unoptimized />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs font-bold text-brand">
              {coin.symbol.slice(0, 2)}
            </span>
          )}
        </div>
        <div>
          <p className="font-semibold text-text-primary">{coin.name}</p>
          <p className={cn("text-xs font-mono transition-colors duration-300", priceFlashClass(direction))}>
            ${coin.symbol} · {formatMemePrice(price)}
            {direction === "up" ? " ↑" : direction === "down" ? " ↓" : ""}
          </p>
        </div>
      </div>

      <div className="mb-4 flex">
        <button
          type="button"
          onClick={() => onSideChange("buy")}
          className={cn(
            "flex-1 h-10 text-sm font-semibold rounded-l touch-target",
            side === "buy" ? "bg-green text-white" : "bg-bg-primary text-text-tertiary border border-border"
          )}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => onSideChange("sell")}
          className={cn(
            "flex-1 h-10 text-sm font-semibold rounded-r touch-target",
            side === "sell" ? "bg-red text-white" : "bg-bg-primary text-text-tertiary border border-border"
          )}
        >
          Sell
        </button>
      </div>

      <div className="mb-3 space-y-1 rounded-xl border border-border bg-bg-primary/60 px-3 py-2.5 text-[12px]">
        <div className="flex justify-between gap-2">
          <span className="text-text-tertiary">Cash available</span>
          <span className="font-mono text-text-secondary">
            {cashBalance === null ? "—" : formatCurrency(cashBalance)}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-text-tertiary">{coin.symbol} held</span>
          <span className="font-mono text-text-secondary">{formatNumber(heldQuantity, heldQuantity < 1 ? 6 : 4)}</span>
        </div>
      </div>

      <label className="mb-1 block text-xs font-medium text-text-tertiary">Amount ({coin.symbol})</label>
      <Input
        type="number"
        min="0"
        step="any"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        placeholder="0.00"
        className="mb-2 font-mono"
      />

      <div className="mb-3 flex gap-2">
        {[0.25, 0.5, 1].map((fraction) => (
          <button
            key={fraction}
            type="button"
            onClick={() => setMax(fraction)}
            className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:bg-bg-hover"
          >
            {fraction === 1 ? "Max" : `${fraction * 100}%`}
          </button>
        ))}
      </div>

      <div className="mb-4 flex justify-between text-sm">
        <span className="text-text-tertiary">Estimated total</span>
        <span className="font-mono font-semibold text-text-primary">{formatCurrency(total)}</span>
      </div>

      {error ? <p className="mb-2 text-sm text-red">{error}</p> : null}
      {success ? <p className="mb-2 text-sm text-green">{success}</p> : null}

      <Button className="w-full min-h-11" disabled={loading} onClick={onSubmit}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {side === "buy" ? `Buy ${coin.symbol}` : `Sell ${coin.symbol}`}
      </Button>

      <p className="mt-3 text-[11px] leading-relaxed text-text-tertiary">
        Meme trades settle instantly from your main USD balance. Minimum trade $1. Prices update live — high volatility.
      </p>
    </div>
  );
}

function CoinListRow({
  coin,
  quantity,
  valueUsd,
  unrealizedPnl,
  unrealizedPnlPct,
  selected,
  onSelect,
}: {
  coin: MemeCoinRow | LiveMemeCoin;
  quantity?: number;
  valueUsd?: number;
  unrealizedPnl?: number;
  unrealizedPnlPct?: number;
  selected?: boolean;
  onSelect: () => void;
}) {
  const liveCoin = coin as LiveMemeCoin;
  const price = liveCoin.livePriceUsd ?? Number(coin.price_usd ?? 0);
  const direction = liveCoin.priceDirection;
  const change = coin.change_24h ?? 0;
  const positive = change >= 0;
  const showPnl = quantity != null && quantity > 0 && unrealizedPnl != null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-bg-hover touch-target",
        selected && "bg-brand/5"
      )}
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-bg-primary">
        {coin.image_url ? (
          <Image src={coin.image_url} alt={coin.name} fill className="object-cover" unoptimized />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs font-bold text-brand">
            {coin.symbol.slice(0, 2)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-text-primary">{coin.name}</p>
          <span className="rounded bg-bg-tertiary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-text-tertiary">
            {SOURCE_LABEL[coin.source]}
          </span>
        </div>
        <p className="text-xs text-text-tertiary">
          {quantity != null && quantity > 0
            ? `${formatNumber(quantity, quantity < 1 ? 6 : 4)} ${coin.symbol}`
            : `$${coin.symbol}`}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("text-sm font-semibold font-mono transition-colors duration-300", priceFlashClass(direction))}>
          {valueUsd != null && valueUsd > 0
            ? formatCurrency(valueUsd)
            : formatMemePrice(price)}
        </p>
        {showPnl ? (
          <p className={cn("text-xs font-mono", unrealizedPnl! >= 0 ? "text-green" : "text-red")}>
            {unrealizedPnl! >= 0 ? "+" : ""}
            {formatCurrency(unrealizedPnl!)} ({formatPercent(unrealizedPnlPct ?? 0)})
          </p>
        ) : (
          <p className={cn("text-xs font-mono", positive ? "text-green" : "text-red")}>
            {coin.change_24h != null ? formatPercent(change) : "—"}
          </p>
        )}
      </div>
    </button>
  );
}

export function MemeCoinWalletOverview({
  userName,
  totalBalance,
  balanceDirection,
  bagValue,
  bagPnl,
  bagPnlPct,
  cashBalance,
  activeTab,
  onTabChange,
  bagItems,
  marketCoins,
  selectedCoin,
  onSelectCoin,
}: {
  userName?: string;
  totalBalance: number;
  balanceDirection?: "up" | "down" | "flat";
  bagValue: number;
  bagPnl: number;
  bagPnlPct: number;
  cashBalance: number | null;
  activeTab: MemeWalletTab;
  onTabChange: (tab: MemeWalletTab) => void;
  bagItems: MemeWalletItem[];
  marketCoins: (MemeCoinRow | LiveMemeCoin)[];
  selectedCoin: (MemeCoinRow | LiveMemeCoin) | null;
  onSelectCoin: (coin: MemeCoinRow | LiveMemeCoin) => void;
}) {
  const displayName = userName?.trim() || "Trader";
  const tabs: { id: MemeWalletTab; label: string }[] = [
    { id: "bag", label: "My bag" },
    { id: "market", label: "Market" },
    { id: "trade", label: "Trade" },
  ];

  const listCoins =
    activeTab === "bag"
      ? bagItems.map((item) => item.coin)
      : marketCoins;

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-bg-secondary shadow-[var(--shadow-card)]">
      <div className="spot-wallet-hero relative rounded-t-2xl px-5 pb-6 pt-5 sm:px-6 sm:pb-7 sm:pt-6">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
            Total balance · Live
          </p>
          <p
            className={cn(
              "mt-2 text-[2rem] font-bold leading-none tracking-tight transition-colors duration-300 sm:text-[2.35rem]",
              balanceDirection === "up"
                ? "text-green-300"
                : balanceDirection === "down"
                  ? "text-red-300"
                  : "text-white"
            )}
          >
            {formatCurrency(totalBalance, "USD")}
            {balanceDirection === "up" ? " ↑" : balanceDirection === "down" ? " ↓" : ""}
          </p>
          {bagItems.length > 0 ? (
            <p
              className={cn(
                "mt-2 text-sm font-mono font-semibold transition-colors duration-300",
                bagPnl >= 0 ? "text-green-300" : "text-red-300"
              )}
            >
              {bagPnl >= 0 ? "+" : ""}
              {formatCurrency(bagPnl)} ({formatPercent(bagPnlPct)}) unrealized
            </p>
          ) : null}
          <p className="mt-2 text-sm text-white/80">{displayName}</p>
          <div className="mt-3 space-y-1 text-xs text-white/60">
            <p>
              Meme bag{" "}
              <span
                className={cn(
                  "font-mono font-semibold transition-colors duration-300",
                  balanceDirection === "up"
                    ? "text-green-300"
                    : balanceDirection === "down"
                      ? "text-red-300"
                      : "text-white/90"
                )}
              >
                {formatCurrency(bagValue)}
              </span>
            </p>
            {cashBalance !== null ? (
              <p>
                Main cash{" "}
                <span className="font-mono font-semibold text-white/90">
                  {formatCurrency(cashBalance)}
                </span>
                {" · "}
                <Link href="/dashboard/deposit" className="underline hover:text-white">
                  Add funds
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex-1 py-3 text-sm font-semibold transition-colors touch-target",
              activeTab === tab.id
                ? "border-b-2 border-brand text-text-primary"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "trade" ? (
        <div className="px-4 py-8 text-center text-sm text-text-secondary">
          Select a coin from <strong>My bag</strong> or <strong>Market</strong>, then open Trade to buy or sell.
        </div>
      ) : listCoins.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-text-secondary">
          {activeTab === "bag" ? (
            <>
              No meme coins yet. Browse <button type="button" className="text-brand underline" onClick={() => onTabChange("market")}>Market</button> to buy today&apos;s picks.
            </>
          ) : (
            "Today&apos;s meme market is empty. Check back after the daily sync runs."
          )}
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto">
          {activeTab === "bag"
            ? bagItems.map((item) => (
                <CoinListRow
                  key={item.coin.id}
                  coin={item.coin}
                  quantity={Number(item.holding.quantity)}
                  valueUsd={item.valueUsd}
                  unrealizedPnl={item.unrealizedPnl}
                  unrealizedPnlPct={item.unrealizedPnlPct}
                  selected={selectedCoin?.id === item.coin.id}
                  onSelect={() => {
                    onSelectCoin(item.coin);
                    onTabChange("trade");
                  }}
                />
              ))
            : marketCoins.map((coin) => (
                <CoinListRow
                  key={coin.id}
                  coin={coin}
                  selected={selectedCoin?.id === coin.id}
                  onSelect={() => {
                    onSelectCoin(coin);
                    onTabChange("trade");
                  }}
                />
              ))}
        </div>
      )}
    </div>
  );
}
