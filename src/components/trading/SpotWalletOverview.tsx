"use client";

import type { HoldingRow } from "@/lib/supabase/types";
import { CryptoIcon } from "@/components/crypto/CryptoIcon";
import { Button } from "@/components/ui/Button";
import { ArrowDownToLine, ArrowUpFromLine, Receipt, TrendingUp } from "@/components/icons";
import { SPOT_ASSETS } from "@/lib/spot-assets";
import { cn, formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import type { MarketPair } from "@/lib/market-data";
import Link from "next/link";

export type WalletRow = {
  symbol: string;
  name: string;
  quantity: number;
  price: number;
  value: number;
  change24h: number;
  depositKey: string;
  pairSymbol: string;
};

export type SpotWalletTab = "coins" | "trade" | "cash";

function buildWalletRows(holdings: HoldingRow[], pairs: MarketPair[]): WalletRow[] {
  const pairBySymbol = new Map<string, MarketPair>();
  for (const pair of pairs) {
    pairBySymbol.set(pair.symbol, pair);
  }

  return SPOT_ASSETS.map((asset) => {
    const held = holdings.find((h) => h.asset.toUpperCase() === asset.symbol);
    const quantity = Number(held?.quantity ?? 0);
    const pair = pairBySymbol.get(asset.pairSymbol);
    const price = pair?.price ?? (asset.symbol === "USDT" ? 1 : 0);
    const change24h = pair?.change24h ?? 0;
    return {
      symbol: asset.symbol,
      name: asset.name,
      quantity,
      price,
      value: quantity * price,
      change24h,
      depositKey: asset.depositKey,
      pairSymbol: asset.pairSymbol,
    };
  });
}

function formatUsdPlain(value: number, decimals = 2) {
  return `${formatNumber(value, decimals)} USD`;
}

function HeaderAction({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: typeof ArrowUpFromLine;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-2 disabled:opacity-45 touch-target"
    >
      <span className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-[var(--brand-accent)]/20 backdrop-blur-sm ring-1 ring-[var(--brand-accent)]/25 sm:h-14 sm:w-14">
        <Icon className="h-5 w-5 text-white" />
      </span>
      <span className="text-[11px] font-medium text-white/90 sm:text-xs">{label}</span>
    </button>
  );
}

const TABS: { id: SpotWalletTab; label: string }[] = [
  { id: "coins", label: "Coins" },
  { id: "trade", label: "Trade" },
  { id: "cash", label: "Cash" },
];

export function SpotWalletOverview({
  userName,
  cashBalance,
  holdings,
  pairs,
  selectedSymbol,
  activeTab,
  onTabChange,
  onSelectAsset,
  onSend,
  onReceive,
  onBuyCrypto,
  onOpenTransactions,
  pendingTransactionCount = 0,
}: {
  userName?: string;
  cashBalance: number | null;
  holdings: HoldingRow[];
  pairs: MarketPair[];
  selectedSymbol: string;
  activeTab: SpotWalletTab;
  onTabChange: (tab: SpotWalletTab) => void;
  onSelectAsset: (pair: MarketPair) => void;
  onSend: () => void;
  onReceive: () => void;
  onBuyCrypto: () => void;
  onOpenTransactions: () => void;
  pendingTransactionCount?: number;
}) {
  const rows = buildWalletRows(holdings, pairs);
  const cryptoValue = rows.reduce((sum, row) => sum + row.value, 0);
  const displayName = userName?.trim() || "Trader";
  const hasSendable = rows.some((row) => row.quantity > 0);

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-bg-secondary shadow-[var(--shadow-card)]">
      <div className="spot-wallet-hero relative rounded-t-2xl px-5 pb-6 pt-5 sm:px-6 sm:pb-7 sm:pt-6">
        <button
          type="button"
          onClick={onOpenTransactions}
          aria-label="Spot wallet transactions"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition-colors hover:bg-white/15 sm:right-6 sm:top-5 touch-target"
        >
          <Receipt className="h-5 w-5" />
          {pendingTransactionCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
              {pendingTransactionCount > 9 ? "9+" : pendingTransactionCount}
            </span>
          )}
        </button>

        <div className="text-center">
          <p className="text-[2rem] font-bold leading-none tracking-tight text-white sm:text-[2.35rem]">
            {formatUsdPlain(cryptoValue, cryptoValue >= 1000 ? 0 : 2)}
          </p>
          <p className="mt-2 text-sm text-white/80">{displayName}</p>
        </div>

        <div className="mt-6 flex justify-center gap-8 sm:gap-10">
          <HeaderAction label="Send" icon={ArrowUpFromLine} onClick={onSend} disabled={!hasSendable} />
          <HeaderAction label="Receive" icon={ArrowDownToLine} onClick={onReceive} />
          <HeaderAction label="Buy crypto" icon={TrendingUp} onClick={onBuyCrypto} />
        </div>
      </div>

      <div className="border-b border-border bg-bg-secondary lg:hidden">
        <div className="flex">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "relative flex-1 py-3.5 text-sm font-semibold transition-colors touch-target",
                  active ? "text-text-primary" : "text-text-tertiary"
                )}
              >
                {tab.label}
                {active && (
                  <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-[var(--brand-accent)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className={cn(activeTab !== "coins" && "hidden lg:block")}>
        <div className="hidden border-b border-border px-5 py-3 sm:px-6 lg:block">
          <h2 className="text-sm font-semibold text-text-primary">Your coins</h2>
          <p className="mt-0.5 text-xs text-text-tertiary">Select a coin, then open Trade to view its chart.</p>
        </div>

        <div className="divide-y divide-border">
          {rows.map((row) => {
            const active = selectedSymbol === row.pairSymbol;
            const pair = pairs.find((p) => p.symbol === row.pairSymbol);
            const isUp = row.change24h >= 0;
            const priceDecimals = row.price < 10 ? 4 : 2;
            const qtyDecimals = row.quantity < 1 ? 6 : 4;

            return (
              <button
                key={row.symbol}
                type="button"
                onClick={() => {
                  if (pair) onSelectAsset(pair);
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors touch-target sm:px-6 sm:py-4",
                  active && "bg-[var(--brand-accent)]/10"
                )}
              >
                <CryptoIcon symbol={row.symbol} label={row.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-text-primary">{row.name}</p>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    <span>{formatUsdPlain(row.price, priceDecimals)}</span>
                    <span className={cn("ml-2 font-medium", isUp ? "text-green" : "text-red")}>
                      {formatPercent(row.change24h)}
                    </span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[13px] font-semibold text-text-primary sm:text-sm">
                    {formatNumber(row.quantity, qtyDecimals)} {row.symbol}
                  </p>
                  <p className="mt-0.5 text-xs text-text-tertiary">{formatUsdPlain(row.value)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={cn("px-5 py-5 sm:px-6", activeTab !== "cash" && "hidden lg:hidden")}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
          Main account cash
        </p>
        <p className="mt-2 text-3xl font-bold font-mono text-text-primary">
          {cashBalance === null ? "—" : formatCurrency(cashBalance)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-text-tertiary">
          Buy crypto on a partner app, then use Receive to deposit into your spot wallet. Use the Trade
          tab to buy with your main account cash.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button className="w-full sm:w-auto" onClick={onBuyCrypto}>
            Buy crypto
          </Button>
          <Link href="/dashboard/deposit" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full">
              Add cash
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export { buildWalletRows };
