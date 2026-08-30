"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { PortfolioSummary } from "@/lib/api/trading";
import { cn, formatCurrency } from "@/lib/utils";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  Wallet,
} from "@/components/icons";

export function DashboardBalanceStrip({
  displayName,
  summary,
  pnl24h,
}: {
  displayName: string;
  summary: PortfolioSummary;
  pnl24h: number | null;
}) {
  const { t } = useTranslation();
  const pnlTone = pnl24h === null ? null : pnl24h >= 0 ? "up" : "down";

  const metrics = [
    {
      label: t("trade.availableCash"),
      value: formatCurrency(summary.cashBalance, summary.currency),
      icon: Wallet,
    },
    {
      label: t("trade.positions"),
      value: formatCurrency(summary.holdingsValue, summary.currency),
      hint:
        summary.holdingsCount > 0
          ? `${summary.holdingsCount} asset${summary.holdingsCount === 1 ? "" : "s"}`
          : t("trade.noHoldings"),
      icon: TrendingUp,
    },
    {
      label: t("dashboard.totalDeposits"),
      value: formatCurrency(summary.totalDeposits, summary.currency),
      icon: ArrowDownToLine,
    },
    {
      label: t("dashboard.totalWithdrawals"),
      value: formatCurrency(summary.totalWithdrawals, summary.currency),
      icon: ArrowUpFromLine,
    },
  ];

  return (
    <div className="rf-card-premium relative overflow-hidden p-5 sm:p-7 lg:p-8">
      <div className="pointer-events-none absolute inset-0 dashboard-hero-glow" aria-hidden />
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full opacity-40"
        style={{ background: "radial-gradient(circle, var(--brand-glow) 0%, transparent 70%)" }}
        aria-hidden
      />

      <div className="relative space-y-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand">
              {t("dashboard.portfolioBalance")}
            </p>
            <p className="mt-3 font-display text-4xl sm:text-5xl lg:text-[3.25rem] font-bold font-mono text-text-primary tabular-nums tracking-tight leading-none">
              {formatCurrency(summary.totalValue, summary.currency)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-base sm:text-lg font-semibold text-text-primary">
                {t("dashboard.welcomeBack", {
                  name: displayName.split(" ")[0] || displayName,
                })}
              </h1>
              {pnl24h !== null && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold font-mono",
                    pnlTone === "up" && "bg-green/10 text-green ring-1 ring-green/20",
                    pnlTone === "down" && "bg-red/10 text-red ring-1 ring-red/20"
                  )}
                >
                  24h {pnl24h >= 0 ? "+" : ""}
                  {formatCurrency(pnl24h, summary.currency)}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-text-tertiary">{t("dashboard.portfolioOverview")}</p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              href="/dashboard/deposit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-brand px-6 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition-opacity hover:opacity-95"
            >
              {t("dashboard.navDeposit")}
            </Link>
            <Link
              href="/dashboard/withdraw"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border/80 bg-bg-secondary/80 px-6 text-sm font-medium text-text-primary backdrop-blur-sm transition-colors hover:border-brand/30 hover:bg-bg-hover"
            >
              {t("dashboard.navWithdraw")}
            </Link>
            <Link
              href="/dashboard/copy-trading"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border/80 bg-bg-secondary/80 px-6 text-sm font-medium text-text-primary backdrop-blur-sm transition-colors hover:border-brand/30 hover:bg-bg-hover"
            >
              {t("dashboard.copyTrading")}
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="group rounded-2xl border border-border/60 bg-bg-primary/40 px-3 py-3.5 backdrop-blur-sm transition-all hover:border-brand/20 hover:shadow-[var(--shadow-card)] sm:px-4 sm:py-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                      {metric.label}
                    </p>
                    <p className="mt-1.5 text-base sm:text-lg font-bold font-mono text-text-primary tabular-nums">
                      {metric.value}
                    </p>
                    {"hint" in metric && metric.hint && (
                      <p className="mt-1 text-[10px] text-text-tertiary line-clamp-1">{metric.hint}</p>
                    )}
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand transition-transform group-hover:scale-105">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
