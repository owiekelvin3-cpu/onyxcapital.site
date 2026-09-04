"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowDownToLine, Loader2, X } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { getUserSignalContext, purchaseSignalPackage } from "@/lib/api/signals";
import { SIGNAL_PLANS, type SignalTier } from "@/lib/signal-plans";
import type { SignalPackageRow } from "@/lib/supabase/types";
import { cn, formatCurrency } from "@/lib/utils";
import { DASHBOARD_REFRESH_EVENT, emitDashboardRefresh } from "@/lib/dashboard-live-sync";

function formatPlanPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

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
                amount: formatPlanPrice(plan.price),
                name: plan.name,
                days: plan.days,
                pct: plan.pct,
              })}
            </p>
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
                  {busy === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t("signals.subscribe")}
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

export function SignalsClient() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<SignalTier | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<(typeof SIGNAL_PLANS)[number] | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [balance, setBalance] = useState(0);
  const [packages, setPackages] = useState<SignalPackageRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
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
      setPackages(ctx.activePackages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load signals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    window.addEventListener(DASHBOARD_REFRESH_EVENT, load);
    return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, load);
  }, [load, userId]);

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
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">{t("signals.title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("signals.subtitle")}</p>
      </div>

      <div className="rounded-2xl border border-border bg-bg-secondary p-5 shadow-[var(--shadow-card)]">
        <p className="text-sm text-text-tertiary">{t("signals.balance")}</p>
        <p className="mt-2 text-3xl font-bold tabular-nums text-text-primary">{formatCurrency(balance)}</p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red/30 bg-red/10 px-4 py-3 text-sm text-red">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-green/30 bg-green/10 px-4 py-3 text-sm text-green">{success}</p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-text-primary">{t("signals.plansTitle")}</h2>
        <div className="space-y-3">
          {SIGNAL_PLANS.map((plan) => {
            const owned = packages.some((p) => p.package_id === plan.id && p.status === "active");
            const canAfford = balance >= plan.price;

            return (
              <article
                key={plan.id}
                className="rounded-2xl border border-border bg-bg-secondary p-5 shadow-[var(--shadow-card)]"
              >
                <h3 className="text-base font-bold tracking-wide text-text-primary">{plan.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{plan.description}</p>
                <p className="mt-4 text-3xl font-bold tabular-nums text-text-primary">
                  {formatPlanPrice(plan.price)}
                </p>
                <p className="mt-1 text-sm font-semibold text-green">{plan.pct}% signal allocation</p>
                <p className="mt-1 text-sm text-text-tertiary">{t("signals.daysAccess", { days: plan.days })}</p>
                {owned ? (
                  <button
                    type="button"
                    disabled
                    className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-green/15 text-sm font-semibold text-green"
                  >
                    {t("signals.planActive")}
                  </button>
                ) : !canAfford ? (
                  <Link
                    href="/dashboard/deposit"
                    className={cn(
                      "mt-4 flex h-11 w-full items-center justify-center rounded-xl border border-border",
                      "bg-bg-tertiary text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-hover"
                    )}
                  >
                    {t("signals.insufficientBalance")}
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={!userId || busy !== null}
                    onClick={() => setConfirmPlan(plan)}
                    className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-green text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {busy === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t("signals.subscribe")}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>

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
