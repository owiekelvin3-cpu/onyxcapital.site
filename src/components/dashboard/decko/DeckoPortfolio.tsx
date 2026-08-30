"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { PortfolioSummary } from "@/lib/api/trading";
import type { ChartPoint } from "@/lib/chart-data";
import type { TradeRow } from "@/lib/supabase/types";
import { cn, formatCurrency } from "@/lib/utils";
import { PortfolioChart } from "@/components/dashboard/PortfolioChartLoader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  DeckoProgressBar,
  DeckoStagger,
  DeckoStaggerItem,
  useCountUp,
} from "@/components/dashboard/decko/decko-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  Wallet,
} from "@/components/icons";

type Props = {
  summary: PortfolioSummary;
  profitTotal: number;
  chartData: ChartPoint[];
  recentTrades: TradeRow[];
};

const CHART_RANGES = ["7D", "30D", "90D"] as const;

function KpiCard({
  label,
  value,
  numeric,
  prefix = "$",
  suffix = "",
  trend,
  trendLabel,
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value?: string;
  numeric?: number;
  prefix?: string;
  suffix?: string;
  trend?: number;
  trendLabel?: string;
  icon: typeof Wallet;
  delay?: number;
}) {
  const animated = useCountUp(numeric ?? 0, { decimals: 2, duration: 1.2 + delay * 0.1 });
  const display = value ?? `${prefix}${animated}${suffix}`;
  const up = trend !== undefined && trend >= 0;

  return (
    <DeckoStaggerItem>
      <motion.div
        className="decko-card h-full p-5"
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-text-secondary">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-text-primary">{display}</p>
            {trend !== undefined && (
              <p className={cn("mt-2 text-xs font-medium", up ? "text-green" : "text-red")}>
                {up ? "+" : ""}
                {trend.toFixed(1)}% {trendLabel}
              </p>
            )}
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-tertiary text-text-primary">
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </motion.div>
    </DeckoStaggerItem>
  );
}

export function DeckoPortfolio({
  summary,
  profitTotal,
  chartData,
  recentTrades,
}: Props) {
  const [chartRange, setChartRange] = useState<(typeof CHART_RANGES)[number]>("30D");

  const filteredChart = useMemo(() => {
    const days = chartRange === "7D" ? 7 : chartRange === "30D" ? 30 : 90;
    if (chartData.length <= days + 1) return chartData;
    return chartData.slice(-(days + 1));
  }, [chartData, chartRange]);

  const profitTrend =
    summary.totalValue > 0 ? (profitTotal / summary.totalValue) * 100 : 0;

  return (
    <div className="decko-dashboard mx-auto max-w-[1320px]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Portfolio</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Track your balance, holdings, and performance in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggle className="rounded-xl border border-border bg-bg-secondary" />
          <Link
            href="/dashboard/deposit"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-secondary px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover"
          >
            <ArrowDownToLine className="h-4 w-4" />
            Deposit
          </Link>
          <Link
            href="/dashboard/copy-trading"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--fin-btn-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--fin-btn-fg)] transition-transform hover:scale-[1.02]"
          >
            <TrendingUp className="h-4 w-4" />
            Copy Trade
          </Link>
        </div>
      </div>

      <DeckoStagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Main Portfolio"
          numeric={summary.totalValue}
          icon={Wallet}
        />
        <KpiCard
          label="Cash Balance"
          numeric={summary.cashBalance}
          icon={ArrowDownToLine}
          delay={0.05}
        />
        <KpiCard
          label="Profit Total"
          value={formatCurrency(profitTotal, summary.currency)}
          trend={profitTrend}
          trendLabel="realized P&L"
          icon={ArrowUpFromLine}
          delay={0.1}
        />
      </DeckoStagger>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_340px]">
        <DeckoStaggerItem className="min-w-0">
          <div className="decko-card p-5 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-text-primary">Performance</h2>
                <p className="text-sm text-text-secondary">Portfolio value over time</p>
              </div>
              <div className="flex gap-1 rounded-xl border border-border bg-bg-primary p-1">
                {CHART_RANGES.map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setChartRange(range)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                      chartRange === range
                        ? "bg-[var(--decko-accent)] text-[var(--decko-accent-text)]"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <PortfolioChart
              balance={summary.totalValue}
              chartData={filteredChart}
            />
          </div>
        </DeckoStaggerItem>

        <DeckoStaggerItem className="space-y-4">
          <div className="decko-card p-5">
            <h2 className="text-lg font-bold text-text-primary">Main balance</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Your portfolio total reflects cash in your main account only.
            </p>
            <div className="mt-5">
              <DeckoProgressBar value={100} delay={0.15} />
              <p className="mt-2 text-xs text-text-tertiary">
                {formatCurrency(summary.cashBalance, summary.currency)} available
              </p>
            </div>
          </div>

          <div className="decko-card p-5">
            <h2 className="text-lg font-bold text-text-primary">Copy trading</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Mirror verified traders at your allocation. Pause or switch experts anytime.
            </p>
            <Link
              href="/dashboard/copy-trading"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--fin-btn-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--fin-btn-fg)]"
            >
              <TrendingUp className="h-4 w-4" />
              Browse traders
            </Link>
          </div>
        </DeckoStaggerItem>
      </div>

      <DeckoStaggerItem className="mt-4">
        <div className="decko-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Need to add funds?</h2>
              <p className="text-sm text-text-secondary">
                Deposits credit your main balance so you can use copy trading, signals, and AI bots.
              </p>
            </div>
            <Link
              href="/dashboard/deposit"
              className="text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              Deposit →
            </Link>
          </div>
          <div className="rounded-2xl border border-dashed border-border px-6 py-8 text-center">
            <p className="text-sm text-text-secondary">
              Choose a crypto or card method to fund your account.
            </p>
            <Link
              href="/dashboard/deposit"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--fin-btn-bg)] px-4 py-2 text-sm font-semibold text-[var(--fin-btn-fg)]"
            >
              <TrendingUp className="h-4 w-4" />
              Go to Deposit
            </Link>
          </div>
        </div>
      </DeckoStaggerItem>

      {recentTrades.length > 0 && (
        <DeckoStaggerItem className="mt-4">
          <div className="decko-card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-primary">Recent Activity</h2>
              <Link
                href="/dashboard/transactions"
                className="text-xs font-medium text-text-secondary hover:text-text-primary"
              >
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {recentTrades.slice(0, 5).map((trade, index) => (
                <motion.div
                  key={trade.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + index * 0.04 }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      {trade.type === "buy" ? "Buy" : "Sell"} {trade.asset}
                    </p>
                    <p className="text-[11px] text-text-tertiary">
                      {new Date(trade.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm tabular-nums text-text-primary">
                      {formatCurrency(trade.amount * trade.price, summary.currency)}
                    </p>
                    <p
                      className={cn(
                        "text-[11px] font-medium capitalize",
                        trade.type === "buy" ? "text-green" : "text-red"
                      )}
                    >
                      {trade.type}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </DeckoStaggerItem>
      )}
    </div>
  );
}
