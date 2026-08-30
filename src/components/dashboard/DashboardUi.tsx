import Link from "next/link";
import type { ReactNode } from "react";
import { cn, formatCurrency } from "@/lib/utils";

export function DashboardSectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-display text-sm font-semibold text-text-primary">{title}</h2>
        {subtitle && <p className="text-xs text-text-tertiary mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function DashboardStatCard({
  label,
  value,
  icon,
  tone,
  hint,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: "default" | "up" | "down";
  hint?: string;
}) {
  return (
    <div className="dashboard-stat-card group relative overflow-hidden rounded-2xl border border-border/80 bg-bg-secondary/90 p-4 backdrop-blur-sm hover:border-brand/20">
      <div className="absolute inset-0 bg-gradient-to-br from-brand/[0.06] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">{label}</p>
          <p
            className={cn(
              "text-lg sm:text-xl font-bold font-mono mt-1.5 tabular-nums",
              tone === "up" && "text-green",
              tone === "down" && "text-red",
              !tone || tone === "default" ? "text-text-primary" : ""
            )}
          >
            {value}
          </p>
          {hint && <p className="text-[10px] text-text-tertiary mt-1">{hint}</p>}
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand transition-transform group-hover:scale-105">
          {icon}
        </span>
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: "Trade", href: "/dashboard/copy-trading", desc: "Copy desk" },
  { label: "Deposit", href: "/dashboard/deposit", desc: "Add funds" },
  { label: "Withdraw", href: "/dashboard/withdraw", desc: "Cash out" },
  { label: "Support", href: "/dashboard/support", desc: "Get help" },
] as const;

export function DashboardQuickActions({
  icons,
}: {
  icons: Record<(typeof QUICK_ACTIONS)[number]["label"], ReactNode>;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {QUICK_ACTIONS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="dashboard-quick-action group flex flex-col gap-3 rounded-2xl border border-border/80 bg-bg-secondary/90 px-4 py-4 backdrop-blur-sm hover:border-brand/25"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-sm transition-transform group-hover:scale-105">
            {icons[item.label]}
          </span>
          <div>
            <p className="font-display text-sm font-semibold text-text-primary">{item.label}</p>
            <p className="text-[11px] text-text-tertiary">{item.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function DashboardHeroCard({
  displayName,
  balance,
  pnl24h,
  chart,
}: {
  displayName: string;
  balance: number;
  pnl24h: number | null;
  chart: ReactNode;
}) {
  const pnlTone = pnl24h === null ? null : pnl24h >= 0 ? "up" : "down";

  return (
    <div className="rf-card-premium relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute inset-0 dashboard-hero-glow" aria-hidden />
      <div className="relative">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
              Portfolio value
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-text-primary mt-2">
              Welcome back{displayName ? `, ${displayName.split(" ")[0]}` : ""}
            </h1>
            <p className="text-3xl sm:text-4xl font-bold font-mono text-text-primary mt-3 tabular-nums tracking-tight">
              {formatCurrency(balance)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {pnl24h !== null && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold font-mono",
                    pnlTone === "up" && "bg-green/10 text-green",
                    pnlTone === "down" && "bg-red/10 text-red"
                  )}
                >
                  24h {pnl24h >= 0 ? "+" : ""}
                  {formatCurrency(pnl24h)}
                </span>
              )}
              <span className="text-xs text-text-tertiary">Estimated total balance</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end shrink-0">
            <Link
              href="/dashboard/deposit"
              className="inline-flex items-center justify-center h-10 px-5 text-sm font-semibold rounded-xl bg-gradient-brand text-white hover:opacity-95 transition-opacity"
            >
              Deposit
            </Link>
            <Link
              href="/dashboard/copy-trading"
              className="inline-flex items-center justify-center h-10 px-5 text-sm font-medium rounded-xl border border-border-light text-text-primary hover:bg-bg-hover transition-colors"
            >
              Trade now
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-border/80">{chart}</div>
      </div>
    </div>
  );
}

export function DashboardPanel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rf-card p-4 sm:p-5 backdrop-blur-sm", className)}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-display text-sm font-semibold text-text-primary">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
