"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { TrendingDown, TrendingUp } from "@/components/icons";
import { HoldingAssetIcon } from "@/components/dashboard/holdings/HoldingAssetIcon";
import { createClient } from "@/lib/supabase/client";
import { getHoldings, getUsdBalance } from "@/lib/api/trading";
import { MARKET_PAIRS } from "@/lib/market-data";
import { useLiveMarketPairs } from "@/hooks/useLiveMarketPairs";
import { DASHBOARD_REFRESH_EVENT } from "@/lib/dashboard-live-sync";
import type { HoldingRow } from "@/lib/supabase/types";
import {
  FEATURED_HOLDINGS,
  buildHoldingRows,
  catalogFromPairs,
} from "@/lib/holding-catalog";
import { cn, formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export function HoldingsDesk() {
  const { t } = useTranslation();
  const pairs = useLiveMarketPairs(MARKET_PAIRS, 20_000);
  const [balance, setBalance] = useState(0);
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const [cash, rows] = await Promise.all([
      getUsdBalance(supabase, user.id).catch(() => 0),
      getHoldings(supabase, user.id).catch(() => [] as HoldingRow[]),
    ]);
    setBalance(cash);
    setHoldings(rows);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    window.addEventListener(DASHBOARD_REFRESH_EVENT, load);
    return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, load);
  }, [load, userId]);

  const catalog = useMemo(
    () => (showAll ? catalogFromPairs(pairs) : FEATURED_HOLDINGS),
    [pairs, showAll]
  );
  const rows = useMemo(() => buildHoldingRows(catalog, holdings, pairs), [catalog, holdings, pairs]);
  const holdingsValue = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="mx-auto max-w-[920px] space-y-5 pb-8">
      <h1 className="sr-only">{t("holdingsPage.title")}</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-bg-secondary p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm text-text-tertiary">{t("holdingsPage.holdingBalance")}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-text-primary">{formatCurrency(balance)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-bg-secondary p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm text-text-tertiary">{t("holdingsPage.valueOfHoldings")}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-text-primary">
            {formatCurrency(holdingsValue)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/deposit"
          className="flex h-12 items-center justify-center rounded-2xl border border-green bg-bg-secondary text-sm font-semibold text-green transition-colors hover:bg-green/10"
        >
          {t("holdingsPage.fundHolding")}
        </Link>
        <button
          type="button"
          onClick={() => setShowAll((open) => !open)}
          className="flex h-12 items-center justify-center rounded-2xl border border-green bg-bg-secondary text-sm font-semibold text-green transition-colors hover:bg-green/10"
        >
          {showAll ? t("holdingsPage.featuredAssets") : t("holdingsPage.allAssets")}
        </button>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-text-primary">{t("holdingsPage.myHoldings")}</h2>
        <div className="space-y-2.5">
          {rows.map((row) => {
            const up = row.change24h >= 0;
            const qtyDecimals = row.quantity > 0 && row.quantity < 1 ? 6 : 2;
            return (
              <Link
                key={row.ticker}
                href={`/dashboard/trade?pair=${encodeURIComponent(row.pairSymbol)}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg-secondary px-4 py-3.5 shadow-[var(--shadow-card)] transition-colors hover:border-brand/30"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <HoldingAssetIcon ticker={row.ticker} name={row.name} category={row.category} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-text-primary">
                      {row.name} <span className="font-medium text-text-secondary">({row.ticker})</span>
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {t(`holdingsPage.kind.${row.category}`, { name: row.name })}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums text-text-primary">
                    {formatNumber(row.quantity, qtyDecimals)} {row.ticker}
                  </p>
                  <p className="mt-0.5 flex items-center justify-end gap-1 text-xs tabular-nums">
                    <span className="text-text-secondary">{formatCurrency(row.value)}</span>
                    <span className={cn("inline-flex items-center font-semibold", up ? "text-green" : "text-red")}>
                      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {formatPercent(row.change24h)}
                    </span>
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
