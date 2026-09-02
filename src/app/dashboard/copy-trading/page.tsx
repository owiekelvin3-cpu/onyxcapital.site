"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import {
  getCopySubscriptions,
  subscribeToTrader,
  uncopyTrader,
} from "@/lib/api/subscriptions";
import { getCopyTraders } from "@/lib/api/copy-traders";
import { getUsdBalance } from "@/lib/api/trading";
import type { CopySubscriptionRow } from "@/lib/supabase/types";
import {
  groupCopyTradersBySection,
  type CopyTraderProfile,
} from "@/lib/copy-traders";
import { DASHBOARD_REFRESH_EVENT, emitDashboardRefresh } from "@/lib/dashboard-live-sync";
import { CopyTraderCard } from "@/components/dashboard/copy-trading/CopyTraderCard";
import { CopyTraderConfirmModal } from "@/components/dashboard/copy-trading/CopyTraderConfirmModal";
import { TraderAvatar } from "@/components/dashboard/copy-trading/TraderAvatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowDownToLine, ChevronLeft, ChevronRight, Loader2, Wallet } from "@/components/icons";
import { cn, formatCurrency } from "@/lib/utils";

function scrollToPageTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function copyErrorMessage(err: unknown, t: (key: string) => string) {
  const message = err instanceof Error ? err.message : "";
  if (/insufficient balance/i.test(message)) return t("copyTrading.insufficientBalance");
  if (/not available/i.test(message)) return t("copyTrading.unavailable");
  return message || t("copyTrading.unavailable");
}

export default function CopyTradingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [traders, setTraders] = useState<CopyTraderProfile[]>([]);
  const [subscriptions, setSubscriptions] = useState<CopySubscriptionRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingTrader, setLoadingTrader] = useState<string | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [error, setError] = useState("");
  const [sectionIndex, setSectionIndex] = useState(0);
  const [balance, setBalance] = useState(0);
  const [confirmTrader, setConfirmTrader] = useState<CopyTraderProfile | null>(null);

  const sections = useMemo(() => groupCopyTradersBySection(traders), [traders]);
  const sectionCount = sections.length;
  const section = sections[Math.min(sectionIndex, Math.max(sectionCount - 1, 0))];
  const hasPrev = sectionIndex > 0;
  const hasNext = sectionIndex < sectionCount - 1;

  useEffect(() => {
    if (sectionIndex > 0 && sectionIndex >= sectionCount) setSectionIndex(0);
  }, [sectionCount, sectionIndex]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      try {
        const catalog = await getCopyTraders(supabase, { activeOnly: true });
        setTraders(catalog);
        if (!user) return;
        setUserId(user.id);
        const [rows, bal] = await Promise.all([
          getCopySubscriptions(supabase, user.id),
          getUsdBalance(supabase, user.id),
        ]);
        setSubscriptions(rows);
        setBalance(bal);
      } catch (err) {
        setError(copyErrorMessage(err, t));
      } finally {
        setLoadingCatalog(false);
      }
    });
  }, [t]);

  useEffect(() => {
    if (!userId) return;

    async function reloadSubscriptions() {
      const supabase = createClient();
      const [rows, bal] = await Promise.all([
        getCopySubscriptions(supabase, userId!),
        getUsdBalance(supabase, userId!),
      ]);
      setSubscriptions(rows);
      setBalance(bal);
    }

    window.addEventListener(DASHBOARD_REFRESH_EVENT, reloadSubscriptions);
    return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, reloadSubscriptions);
  }, [userId]);

  function goToSection(index: number) {
    setSectionIndex(index);
    scrollToPageTop();
  }

  async function handleCopy(trader: CopyTraderProfile) {
    setError("");

    if (!userId) {
      router.push("/register");
      return;
    }

    const price = Number(trader.price);
    if (!Number.isFinite(price) || price <= 0) {
      setError(t("copyTrading.unavailable"));
      return;
    }
    if (balance < price) {
      setError(t("copyTrading.insufficientBalance"));
      return;
    }

    setLoadingTrader(trader.name);
    try {
      const supabase = createClient();
      const row = await subscribeToTrader(supabase, {
        userId,
        traderName: trader.name,
        allocation: price,
      });
      setSubscriptions((prev) => {
        const without = prev.filter((s) => s.trader_name !== trader.name);
        return [row, ...without];
      });
      setBalance((prev) => Math.max(0, prev - price));
      setConfirmTrader(null);
      emitDashboardRefresh();
    } catch (err) {
      setError(copyErrorMessage(err, t));
    } finally {
      setLoadingTrader(null);
    }
  }

  async function handleUncopy(traderName: string) {
    setError("");
    if (!userId) return;

    setLoadingTrader(traderName);
    try {
      const supabase = createClient();
      await uncopyTrader(supabase, traderName);
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.trader_name === traderName && s.status === "active"
            ? { ...s, status: "cancelled" }
            : s
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not uncopy this trader");
    } finally {
      setLoadingTrader(null);
    }
  }

  const activeSubscriptions = subscriptions.filter((s) => s.status === "active");
  const activeTraders = new Set(activeSubscriptions.map((s) => s.trader_name));

  return (
    <div className="decko-dashboard mx-auto max-w-[1320px] space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t("copyTrading.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">{t("copyTrading.subtitle")}</p>
      </div>

      {userId && (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
              {t("copyTrading.balance")}
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-2xl font-semibold text-text-primary">
              <Wallet className="h-5 w-5 text-text-tertiary" />
              {formatCurrency(balance)}
            </p>
          </div>
          <Link href="/dashboard/deposit" className="w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto">
              <ArrowDownToLine className="h-4 w-4" />
              {t("dashboard.navDeposit")}
            </Button>
          </Link>
        </Card>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-red/30 bg-red/10 px-4 py-3 text-sm text-red">
          {error}
        </p>
      )}

      {activeSubscriptions.length > 0 && (
        <Card className="p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-text-primary">{t("copyTrading.activeSubs")}</h2>
          <div className="mt-3 space-y-3">
            {activeSubscriptions.map((sub) => {
              const profile = traders.find((trader) => trader.name === sub.trader_name);
              const profit = Number(sub.profit_earned ?? 0);
              const paid = Number(sub.allocation ?? profile?.price ?? 0);
              return (
                <div
                  key={sub.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {profile ? (
                      <TraderAvatar trader={profile} size="sm" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-tertiary text-xs font-bold">
                        {sub.trader_name.charAt(0)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">{sub.trader_name}</p>
                      <p className="text-xs capitalize text-text-tertiary">
                        {sub.status} · {t("copyTrading.paid", { price: formatCurrency(paid) })}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                        {t("copyTrading.profitEarned")}
                      </p>
                      <p
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          profit >= 0 ? "text-green" : "text-red"
                        )}
                      >
                        {profit >= 0 ? "+" : ""}
                        {formatCurrency(profit)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={loadingTrader === sub.trader_name}
                      onClick={() => handleUncopy(sub.trader_name)}
                    >
                      {loadingTrader === sub.trader_name ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Uncopy"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {loadingCatalog ? (
        <div className="flex min-h-[30vh] items-center justify-center text-sm text-text-tertiary">
          {t("common.loading")}…
        </div>
      ) : sectionCount === 0 || !section ? (
        <Card className="p-6 text-center text-sm text-text-tertiary">{t("copyTrading.emptyCatalog")}</Card>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sections.map((s, index) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goToSection(index)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                  index === sectionIndex
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-bg-secondary text-text-secondary hover:border-accent/40 hover:text-text-primary"
                )}
              >
                {s.title}
              </button>
            ))}
          </div>

          <section className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-accent">
                  Section {sectionIndex + 1} of {sectionCount}
                </p>
                <h2 className="text-lg font-bold text-text-primary">{section.title}</h2>
                <p className="mt-0.5 max-w-2xl text-sm text-text-tertiary">{section.subtitle}</p>
              </div>
              <p className="shrink-0 text-xs text-text-tertiary">
                {section.traders.length} trader{section.traders.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {section.traders.map((trader, index) => (
                <CopyTraderCard
                  key={trader.id ?? trader.name}
                  trader={trader}
                  index={sectionIndex * 6 + index}
                  isActive={activeTraders.has(trader.name)}
                  userId={userId}
                  loading={loadingTrader === trader.name}
                  canAfford={balance >= trader.price}
                  onCopy={() => setConfirmTrader(trader)}
                  onUncopy={() => handleUncopy(trader.name)}
                />
              ))}
            </div>

            <Card className="space-y-4 p-4 sm:p-5">
              <div>
                <p className="text-sm font-semibold text-text-primary">Browse other sections</p>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  Jump to another category or use previous / next below.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {sections.map((s, index) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goToSection(index)}
                    disabled={index === sectionIndex}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
                      index === sectionIndex
                        ? "cursor-default border-accent/50 bg-accent/10 text-accent"
                        : "border-border bg-bg-secondary text-text-secondary hover:border-accent/40 hover:text-text-primary"
                    )}
                  >
                    {s.title}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!hasPrev}
                  onClick={() => goToSection(sectionIndex - 1)}
                  className="gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {hasPrev ? sections[sectionIndex - 1].title : "Previous"}
                </Button>

                <p className="text-center text-xs text-text-tertiary">
                  {sectionIndex + 1} / {sectionCount}
                </p>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!hasNext}
                  onClick={() => goToSection(sectionIndex + 1)}
                  className="gap-1.5 sm:ml-auto"
                >
                  {hasNext ? sections[sectionIndex + 1].title : "Next"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </section>
        </>
      )}

      {confirmTrader && (
        <CopyTraderConfirmModal
          trader={confirmTrader}
          balance={balance}
          busy={loadingTrader === confirmTrader.name}
          onClose={() => setConfirmTrader(null)}
          onConfirm={() => void handleCopy(confirmTrader)}
        />
      )}
    </div>
  );
}
