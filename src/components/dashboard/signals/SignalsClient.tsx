"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  ArrowDownToLine,
  Bell,
  Check,
  Loader2,
  Lock,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import {
  getUserSignalContext,
  purchaseSignalPackage,
} from "@/lib/api/signals";
import { SIGNAL_PLANS, signalTierLabel, signalTierRank, type SignalTier } from "@/lib/signal-plans";
import type { SignalPackageRow, TradingSignalRow } from "@/lib/supabase/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { emitDashboardRefresh } from "@/lib/dashboard-live-sync";

type Filter = "active" | "closed" | "all";

function SignalPlanConfirmModal({
  plan,
  balance,
  busy,
  onClose,
  onConfirm,
}: {
  plan: (typeof SIGNAL_PLANS)[number];
  balance: number;
  busy: SignalTier | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const canAfford = balance >= plan.price;

  useEffect(() => {
    const { documentElement: html, body } = document;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] isolate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signal-confirm-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label={t("signals.cancel")}
      />
      <div className="absolute inset-x-0 bottom-0 z-10 sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4">
        <div className="flex max-h-[min(85dvh,calc(100dvh-var(--safe-bottom)))] flex-col overflow-hidden rounded-t-3xl border border-border bg-bg-secondary shadow-[var(--shadow-card)] safe-area-bottom sm:rounded-2xl">
          <div className="overflow-y-auto p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 id="signal-confirm-title" className="pr-2 text-lg font-bold text-text-primary">
                {t("signals.confirmTitle")}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-xl p-2 text-text-tertiary hover:bg-bg-hover hover:text-text-primary touch-manipulation"
                aria-label={t("signals.cancel")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              {t("signals.confirmBody", {
                amount: formatCurrency(plan.price),
                name: plan.name,
                days: plan.days,
              })}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-text-tertiary">{t("signals.riskBody")}</p>
            {!canAfford && (
              <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-200">
                {t("signals.insufficientBalance")}
              </p>
            )}
          </div>
          <div className="shrink-0 border-t border-border p-5 pt-4 sm:p-6 sm:pt-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="w-full touch-manipulation sm:flex-1"
                onClick={onClose}
              >
                {t("signals.cancel")}
              </Button>
              {canAfford ? (
                <Button
                  type="button"
                  size="lg"
                  className="w-full touch-manipulation sm:flex-1"
                  disabled={busy !== null}
                  onClick={onConfirm}
                >
                  {busy === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("signals.subscribe")
                  )}
                </Button>
              ) : (
                <Link href="/dashboard/deposit" className="w-full sm:flex-1" onClick={onClose}>
                  <Button type="button" size="lg" className="w-full touch-manipulation">
                    <ArrowDownToLine className="h-4 w-4" />
                    {t("dashboard.navDeposit")}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function rrRatio(entry: string, target: string, stop: string) {
  const e = parseFloat(entry);
  const t = parseFloat(target);
  const s = parseFloat(stop);
  if (!e || !t || !s || e === s) return "—";
  const reward = Math.abs(t - e);
  const risk = Math.abs(e - s);
  if (risk <= 0) return "—";
  return (reward / risk).toFixed(1);
}

export function SignalsClient() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<SignalTier | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<(typeof SIGNAL_PLANS)[number] | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [balance, setBalance] = useState(0);
  const [tierRank, setTierRank] = useState(0);
  const [packages, setPackages] = useState<SignalPackageRow[]>([]);
  const [signals, setSignals] = useState<TradingSignalRow[]>([]);
  const [filter, setFilter] = useState<Filter>("active");
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);
    try {
      const ctx = await getUserSignalContext(supabase, user.id);
      setBalance(ctx.balance);
      setTierRank(ctx.tierRank);
      setPackages(ctx.activePackages);
      setSignals(ctx.signals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load signals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredSignals = useMemo(() => {
    return signals.filter((s) => {
      if (filter === "active") return s.status === "active";
      if (filter === "closed") return s.status === "closed";
      return true;
    });
  }, [signals, filter]);

  const visibleSignals = useMemo(() => {
    if (tierRank <= 0) return [];
    return filteredSignals.filter(
      (s) => signalTierRank(s.min_tier) <= tierRank
    );
  }, [filteredSignals, tierRank]);

  async function handlePurchase(planId: SignalTier) {
    if (!userId) return;
    setError("");
    setSuccess("");
    setBusy(planId);
    try {
      const supabase = createClient();
      const row = await purchaseSignalPackage(supabase, { userId, planId });
      setSuccess(t("signals.subscribed", { name: row.package_name }));
      setConfirmPlan(null);
      emitDashboardRefresh();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="decko-dashboard flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="decko-dashboard mx-auto max-w-[1320px] space-y-8 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Signal desk</p>
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">{t("signals.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">{t("signals.subtitle")}</p>
        </div>
        <Card className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-tertiary">
            <Wallet className="h-4 w-4 text-text-primary" />
          </span>
          <div>
            <p className="text-xs text-text-tertiary">{t("signals.balance")}</p>
            <p className="text-lg font-bold text-text-primary">{formatCurrency(balance)}</p>
          </div>
          <Link href="/dashboard/deposit">
            <Button size="sm" variant="secondary" className="gap-1.5">
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Deposit
            </Button>
          </Link>
        </Card>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red/30 bg-red/10 px-4 py-3 text-sm text-red">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-green/30 bg-green/10 px-4 py-3 text-sm text-green">
          {success}
        </p>
      )}

      {packages.length > 0 && (
        <Card className="p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-text-primary">{t("signals.activeSubs")}</h2>
          <div className="mt-3 space-y-2">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold text-text-primary">{pkg.package_name}</p>
                  <p className="text-xs text-text-tertiary">
                    {formatCurrency(pkg.price)} ·{" "}
                    {pkg.expires_at
                      ? `${t("signals.expires")} ${formatDate(pkg.expires_at)}`
                      : t("signals.planActive")}
                  </p>
                </div>
                <span className="rounded-full bg-green/10 px-2.5 py-1 text-xs font-medium text-green">
                  {t("signals.status.active")}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-text-primary">{t("signals.plansTitle")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SIGNAL_PLANS.map((plan, index) => {
            const owned = packages.some(
              (p) => p.package_id === plan.id && p.status === "active"
            );
            const canAfford = balance >= plan.price;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "decko-card flex flex-col p-5",
                  plan.highlighted && "ring-2 ring-[var(--decko-accent)] ring-offset-2 ring-offset-bg-primary"
                )}
              >
                {plan.highlighted && (
                  <span className="mb-2 w-fit rounded-full bg-[var(--decko-accent)] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[var(--decko-accent-text)]">
                    Popular
                  </span>
                )}
                <h3 className="text-base font-bold text-text-primary">{plan.name}</h3>
                <p className="mt-1 text-xs text-text-tertiary">{plan.description}</p>
                <p className="mt-4 text-3xl font-bold text-text-primary">
                  {formatCurrency(plan.price)}
                  <span className="text-sm font-normal text-text-tertiary">
                    {" "}
                    {t("signals.perPeriod", { days: plan.days })}
                  </span>
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-text-secondary">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  className="mt-5 w-full"
                  variant={plan.highlighted ? "brand" : "secondary"}
                  disabled={!userId || owned || busy !== null}
                  onClick={() => setConfirmPlan(plan)}
                >
                  {owned ? (
                    t("signals.planActive")
                  ) : busy === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : !canAfford ? (
                    t("signals.insufficientBalance")
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5" />
                      {t("signals.subscribe")}
                    </>
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-text-primary">{t("signals.deskTitle")}</h2>
          <div className="flex gap-1 rounded-xl border border-border bg-bg-secondary p-1">
            {(["active", "closed", "all"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === f
                    ? "bg-bg-primary text-text-primary shadow-sm"
                    : "text-text-tertiary hover:text-text-primary"
                )}
              >
                {t(`signals.filter.${f}`)}
              </button>
            ))}
          </div>
        </div>

        {tierRank <= 0 ? (
          <Card className="flex flex-col items-center p-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-tertiary">
              <Lock className="h-6 w-6 text-text-tertiary" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-text-primary">{t("signals.lockedTitle")}</h3>
            <p className="mt-2 max-w-md text-sm text-text-secondary">{t("signals.lockedBody")}</p>
          </Card>
        ) : visibleSignals.length === 0 ? (
          <Card className="p-8 text-center text-sm text-text-tertiary">{t("signals.deskEmpty")}</Card>
        ) : (
          <div className="space-y-3 md:hidden">
            {visibleSignals.map((signal) => (
              <Card key={signal.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-text-primary">{signal.symbol}</p>
                    <p className={cn("text-xs font-semibold uppercase", signal.direction === "buy" ? "text-green" : "text-red")}>
                      {signal.direction}
                    </p>
                  </div>
                  <span className="rounded-full bg-bg-tertiary px-2 py-0.5 text-[10px] uppercase text-text-tertiary">
                    {signalTierLabel(signal.min_tier)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-text-tertiary">{t("signals.colEntry")}</p>
                    <p className="font-mono font-medium">{signal.entry_price}</p>
                  </div>
                  <div>
                    <p className="text-text-tertiary">{t("signals.colTarget")}</p>
                    <p className="font-mono font-medium text-green">{signal.target_price}</p>
                  </div>
                  <div>
                    <p className="text-text-tertiary">{t("signals.colStop")}</p>
                    <p className="font-mono font-medium text-red">{signal.stop_price}</p>
                  </div>
                  <div>
                    <p className="text-text-tertiary">{t("signals.colRR")}</p>
                    <p className="font-mono font-medium">
                      {rrRatio(signal.entry_price, signal.target_price, signal.stop_price)}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-text-tertiary">
                  {signal.confidence}% {t("signals.colConf")} · {formatDate(signal.published_at)}
                </p>
              </Card>
            ))}
          </div>
        )}

        {tierRank > 0 && visibleSignals.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-tertiary">
                  <th className="py-3 pr-4 font-medium">{t("signals.colSymbol")}</th>
                  <th className="py-3 pr-4 font-medium">{t("signals.colSide")}</th>
                  <th className="py-3 pr-4 font-medium">{t("signals.colEntry")}</th>
                  <th className="py-3 pr-4 font-medium">{t("signals.colTarget")}</th>
                  <th className="py-3 pr-4 font-medium">{t("signals.colStop")}</th>
                  <th className="py-3 pr-4 font-medium">{t("signals.colRR")}</th>
                  <th className="py-3 pr-4 font-medium">{t("signals.colConf")}</th>
                  <th className="py-3 font-medium">{t("signals.colStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleSignals.map((signal) => (
                  <tr key={signal.id} className="hover:bg-bg-hover/40">
                    <td className="py-3 pr-4 font-semibold">{signal.symbol}</td>
                    <td className={cn("py-3 pr-4 uppercase text-xs font-semibold", signal.direction === "buy" ? "text-green" : "text-red")}>
                      {signal.direction}
                    </td>
                    <td className="py-3 pr-4 font-mono">{signal.entry_price}</td>
                    <td className="py-3 pr-4 font-mono text-green">{signal.target_price}</td>
                    <td className="py-3 pr-4 font-mono text-red">{signal.stop_price}</td>
                    <td className="py-3 pr-4 font-mono">
                      {rrRatio(signal.entry_price, signal.target_price, signal.stop_price)}
                    </td>
                    <td className="py-3 pr-4">{signal.confidence}%</td>
                    <td className="py-3 capitalize text-text-tertiary">{signal.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-text-primary">{t("signals.howItWorksTitle")}</h3>
            <p className="mt-1 max-w-xl text-sm text-text-secondary">{t("signals.howItWorksBody")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/copy-trading">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                {t("signals.openTradingRoom")}
              </Button>
            </Link>
            <Link href="/dashboard/notifications">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <Bell className="h-3.5 w-3.5" />
                {t("signals.openNotifications")}
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {confirmPlan && (
        <SignalPlanConfirmModal
          plan={confirmPlan}
          balance={balance}
          busy={busy}
          onClose={() => setConfirmPlan(null)}
          onConfirm={() => void handlePurchase(confirmPlan.id)}
        />
      )}
    </div>
  );
}
