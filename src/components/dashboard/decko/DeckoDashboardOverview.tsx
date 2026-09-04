"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import type { PortfolioSummary } from "@/lib/api/trading";
import type { ChartPoint } from "@/lib/chart-data";
import type { MarketPair } from "@/lib/market-data";
import type { TradeRow } from "@/lib/supabase/types";
import { cn, formatCurrency } from "@/lib/utils";
import {
  DeckoStagger,
  DeckoStaggerItem,
  useCountUp,
} from "@/components/dashboard/decko/decko-motion";
import { SignalStrengthCard } from "@/components/dashboard/decko/SignalStrengthCard";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import {
  ArrowDownToLine,
  Bot,
  TrendingUp,
  Users,
  Zap,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";

type Props = {
  displayName: string;
  userEmail?: string;
  avatarUrl?: string;
  summary: PortfolioSummary;
  profitTotal: number;
  openOrders: number;
  tradesCount: number;
  chartData: ChartPoint[];
  recentTrades: TradeRow[];
  marketPairs: MarketPair[];
  signalPct?: number;
  signalPlanName?: string | null;
  signalExpiresAt?: string | null;
};

const QUICK_ACTIONS = [
  { label: "Deposit", href: "/dashboard/deposit", icon: ArrowDownToLine },
  { label: "Copy Trading", href: "/dashboard/copy-trading", icon: Users },
  { label: "Trading Signals", href: "/dashboard/signals", icon: Zap },
  { label: "AI Trading", href: "/dashboard/ai-trading", icon: Bot },
] as const;

function KpiCard({
  label,
  value,
  numeric,
  decimals = 0,
  prefix = "",
  suffix = "",
  trend,
  trendLabel,
  icon: Icon,
  delay = 0,
  compact = false,
}: {
  label: string;
  value?: string;
  numeric?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  trend?: number;
  trendLabel?: string;
  icon: typeof Users;
  delay?: number;
  compact?: boolean;
}) {
  const animated = useCountUp(numeric ?? 0, { decimals, duration: 1.2 + delay * 0.1 });
  const display = value ?? `${prefix}${animated}${suffix}`;
  const up = trend !== undefined && trend >= 0;

  return (
    <DeckoStaggerItem>
      <motion.div
        className={cn("decko-card h-full", compact ? "p-3.5" : "p-4 lg:p-5")}
        whileHover={{ y: compact ? 0 : -4, transition: { duration: 0.2 } }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn("text-text-secondary", compact ? "text-xs" : "text-sm")}>{label}</p>
            <p
              className={cn(
                "mt-1 font-bold tracking-tight text-text-primary",
                compact ? "text-lg" : "mt-2 text-xl lg:text-2xl"
              )}
            >
              {display}
            </p>
            {trend !== undefined && !compact && (
              <p className={cn("mt-1.5 text-xs font-medium lg:mt-2", up ? "text-green" : "text-red")}>
                {up ? "+" : ""}
                {trend.toFixed(1)}% {trendLabel}
              </p>
            )}
          </div>
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl bg-bg-tertiary text-text-primary",
              compact ? "h-8 w-8" : "h-10 w-10"
            )}
          >
            <Icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
          </span>
        </div>
      </motion.div>
    </DeckoStaggerItem>
  );
}

function MobilePortfolioHero({
  totalValue,
  currency,
  profitTotal,
  profitTrend,
}: {
  totalValue: number;
  currency: string;
  profitTotal: number;
  profitTrend: number;
}) {
  const animatedTotal = useCountUp(totalValue, { decimals: 2, duration: 1.2 });
  const profitUp = profitTotal >= 0;
  const trendUp = profitTrend >= 0;

  return (
    <div className="decko-card overflow-hidden lg:hidden">
      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="min-w-0 p-4 pr-3 sm:p-5 sm:pr-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary sm:text-xs">
            Total Portfolio
          </p>
          <p className="mt-1.5 truncate text-xl font-bold tabular-nums tracking-tight text-text-primary sm:text-2xl">
            {formatCurrency(Number(animatedTotal), currency)}
          </p>
          <p className="mt-1 text-[11px] text-text-tertiary sm:text-xs">Account value</p>
        </div>

        <div className="min-w-0 p-4 pl-3 sm:p-5 sm:pl-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary sm:text-xs">
            Profit Total
          </p>
          <p
            className={cn(
              "mt-1.5 truncate text-xl font-bold tabular-nums tracking-tight sm:text-2xl",
              profitUp ? "text-green" : "text-red"
            )}
          >
            {profitUp ? "+" : ""}
            {formatCurrency(profitTotal, currency)}
          </p>
          <p className={cn("mt-1 text-[11px] font-medium sm:text-xs", trendUp ? "text-green" : "text-red")}>
            {trendUp ? "+" : ""}
            {profitTrend.toFixed(1)}% realized P&amp;L
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-t border-border bg-bg-secondary/40 p-3 sm:p-4">
        <Link href="/dashboard/copy-trading" className="min-w-0 flex-1">
          <Button className="w-full gap-1.5" size="sm">
            <Users className="h-3.5 w-3.5 shrink-0" />
            Copy Trade
          </Button>
        </Link>
        <Link href="/dashboard/deposit" className="min-w-0 flex-1">
          <Button variant="secondary" className="w-full gap-1.5" size="sm">
            <ArrowDownToLine className="h-3.5 w-3.5 shrink-0" />
            Deposit
          </Button>
        </Link>
      </div>
    </div>
  );
}

function QuickActionsGrid({ openOrders, tradesCount, mobile = false }: { openOrders: number; tradesCount: number; mobile?: boolean }) {
  return (
    <div className={cn("decko-card", mobile ? "p-4" : "p-5 sm:p-6")}>
      <div className="mb-3 flex items-center justify-between gap-2 lg:mb-4">
        <h2 className={cn("font-bold text-text-primary", mobile ? "text-base" : "text-lg")}>
          Quick Actions
        </h2>
        <span className="rounded-full bg-bg-tertiary px-2 py-0.5 text-[10px] text-text-secondary lg:px-2.5 lg:py-1 lg:text-xs">
          {openOrders} open · {tradesCount} trades
        </span>
      </div>
      <div
        className={cn(
          "grid gap-2 sm:gap-2.5",
          mobile ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 lg:grid-cols-4"
        )}
      >
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-bg-primary text-center transition-colors active:border-[var(--decko-accent)] active:bg-bg-secondary",
                mobile ? "p-2.5 sm:p-3" : "items-start gap-3 rounded-2xl p-4 hover:border-[var(--decko-accent)]"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-xl bg-bg-secondary text-text-primary",
                  mobile ? "h-9 w-9" : "h-10 w-10 shadow-sm"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span
                className={cn(
                  "font-semibold leading-tight text-text-primary",
                  mobile ? "text-[10px] sm:text-[11px]" : "text-sm"
                )}
              >
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function DeckoDashboardOverview({
  displayName,
  userEmail,
  avatarUrl,
  summary,
  profitTotal,
  openOrders,
  tradesCount,
  chartData: _chartData,
  recentTrades: _recentTrades,
  marketPairs: _marketPairs,
  signalPct = 0,
  signalPlanName,
}: Props) {
  const firstName = displayName.split(" ")[0] || displayName || "Trader";
  const initial = (displayName || userEmail || "U").charAt(0).toUpperCase();

  const profitTrend =
    summary.totalValue > 0 ? (profitTotal / summary.totalValue) * 100 : 0;
  const depositTrend =
    summary.totalDeposits > 0
      ? ((summary.totalValue - summary.totalWithdrawals) / summary.totalDeposits - 1) * 100
      : 15;

  const today = new Date();
  const calendarDays = useMemo(() => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<number | null> = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [today]);

  return (
    <div className="decko-dashboard mx-auto w-full max-w-[1320px] space-y-3.5 pb-2 sm:space-y-4 lg:space-y-6 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:gap-3 lg:mb-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-text-primary sm:text-2xl lg:text-3xl">
            Hello, {firstName}!
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary lg:mt-1">
            Here&apos;s your trading overview
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:gap-3 lg:flex">
          <ThemeToggle className="rounded-xl border border-border bg-bg-secondary" />
          <NotificationBell />
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-bg-secondary py-1.5 pl-1.5 pr-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-9 w-9 rounded-xl object-cover" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--fin-btn-bg)] text-sm font-bold text-[var(--fin-btn-fg)]">
                {initial}
              </span>
            )}
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold text-text-primary">{displayName || "Trader"}</p>
              <p className="truncate text-xs text-text-secondary">{userEmail}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile hero — portfolio & profit side by side */}
      <MobilePortfolioHero
        totalValue={summary.totalValue}
        currency={summary.currency}
        profitTotal={profitTotal}
        profitTrend={profitTrend}
      />

      {/* Mobile quick actions */}
      <div className="lg:hidden">
        <QuickActionsGrid openOrders={openOrders} tradesCount={tradesCount} mobile />
      </div>

      {/* Desktop KPIs */}
      <DeckoStagger className="hidden gap-4 lg:grid lg:grid-cols-2">
        <KpiCard
          label="Total Portfolio"
          numeric={summary.totalValue}
          decimals={2}
          prefix="$"
          trend={depositTrend}
          trendLabel="from deposits"
          icon={Users}
        />
        <KpiCard
          label="Profit Total"
          value={formatCurrency(profitTotal, summary.currency)}
          trend={profitTrend}
          trendLabel="realized P&L"
          icon={TrendingUp}
          delay={0.05}
        />
      </DeckoStagger>

      {/* Signal — mobile, compact placement */}
      <div className="lg:hidden">
        <SignalStrengthCard signalPct={signalPct} planName={signalPlanName} compact />
      </div>

      <div className="hidden gap-3.5 sm:gap-4 xl:grid xl:grid-cols-2">
        <DeckoStaggerItem>
          <SignalStrengthCard signalPct={signalPct} planName={signalPlanName} />
        </DeckoStaggerItem>

        <DeckoStaggerItem>
          <div className="decko-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-primary">
                {today.toLocaleString(undefined, { month: "long", year: "numeric" })}
              </h2>
              <div className="flex gap-1">
                <button type="button" className="rounded-lg px-2 py-1 text-text-tertiary hover:bg-bg-tertiary">
                  ‹
                </button>
                <button type="button" className="rounded-lg px-2 py-1 text-text-tertiary hover:bg-bg-tertiary">
                  ›
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-text-tertiary">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1 text-center text-sm">
              {calendarDays.map((day, i) =>
                day === null ? (
                  <span key={`e-${i}`} />
                ) : (
                  <span
                    key={day}
                    className={cn(
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-full",
                      day === today.getDate()
                        ? "bg-[var(--decko-accent)] font-semibold text-[var(--decko-accent-text)]"
                        : "text-text-secondary"
                    )}
                  >
                    {day}
                  </span>
                )
              )}
            </div>
          </div>
        </DeckoStaggerItem>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:gap-4 lg:grid-cols-2">
        <DeckoStaggerItem>
          <div className="decko-card p-4 sm:p-5 lg:p-6">
            <h2 className="text-base font-bold text-text-primary lg:text-lg">Copy trading</h2>
            <p className="mt-3 text-sm text-text-tertiary leading-relaxed">
              Follow verified traders and mirror their positions at your allocation. Pause or change
              experts anytime from your dashboard.
            </p>
            <Link
              href="/dashboard/copy-trading"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-bg-primary px-4 py-2 text-sm font-semibold text-text-primary hover:bg-bg-hover"
            >
              Browse traders
            </Link>
          </div>
        </DeckoStaggerItem>

        <DeckoStaggerItem className="hidden lg:block">
          <QuickActionsGrid openOrders={openOrders} tradesCount={tradesCount} />
        </DeckoStaggerItem>
      </div>
    </div>
  );
}
