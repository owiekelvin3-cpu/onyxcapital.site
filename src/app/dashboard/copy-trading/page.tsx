"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getCopySubscriptions,
  subscribeToTrader,
  uncopyTrader,
} from "@/lib/api/subscriptions";
import type { CopySubscriptionRow } from "@/lib/supabase/types";
import { COPY_TRADER_SECTIONS, COPY_TRADERS } from "@/lib/copy-traders";
import { DASHBOARD_REFRESH_EVENT } from "@/lib/dashboard-live-sync";
import { CopyTraderCard } from "@/components/dashboard/copy-trading/CopyTraderCard";
import { TraderAvatar } from "@/components/dashboard/copy-trading/TraderAvatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, Loader2 } from "@/components/icons";
import { cn, formatCurrency } from "@/lib/utils";

const COPY_ALLOCATION = 0;

function scrollToPageTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export default function CopyTradingPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<CopySubscriptionRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingTrader, setLoadingTrader] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [sectionIndex, setSectionIndex] = useState(0);

  const section = COPY_TRADER_SECTIONS[sectionIndex];
  const sectionCount = COPY_TRADER_SECTIONS.length;
  const hasPrev = sectionIndex > 0;
  const hasNext = sectionIndex < sectionCount - 1;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const rows = await getCopySubscriptions(supabase, user.id);
      setSubscriptions(rows);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    async function reloadSubscriptions() {
      const supabase = createClient();
      const rows = await getCopySubscriptions(supabase, userId!);
      setSubscriptions(rows);
    }

    window.addEventListener(DASHBOARD_REFRESH_EVENT, reloadSubscriptions);
    return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, reloadSubscriptions);
  }, [userId]);

  function goToSection(index: number) {
    setSectionIndex(index);
    scrollToPageTop();
  }

  async function handleCopy(traderName: string) {
    setError("");

    if (!userId) {
      router.push("/register");
      return;
    }

    setLoadingTrader(traderName);
    try {
      const supabase = createClient();
      const row = await subscribeToTrader(supabase, {
        userId,
        traderName,
        allocation: COPY_ALLOCATION,
      });
      setSubscriptions((prev) => {
        const without = prev.filter((s) => s.trader_name !== traderName);
        return [row, ...without];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copy subscription failed");
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
        <h1 className="text-2xl font-bold text-text-primary">Copy Trading</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Follow top performers like a social feed — free to follow, no subscription fee.
          Past performance is not indicative of future results.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red/30 bg-red/10 px-4 py-3 text-sm text-red">
          {error}
        </p>
      )}

      {activeSubscriptions.length > 0 && (
        <Card className="p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-text-primary">Following</h2>
          <div className="mt-3 space-y-3">
            {activeSubscriptions.map((sub) => {
              const profile = COPY_TRADERS.find((t) => t.name === sub.trader_name);
              const profit = Number(sub.profit_earned ?? 0);
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
                        {sub.status} · Free
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                        Copy P/L
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

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {COPY_TRADER_SECTIONS.map((s, index) => (
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
              key={trader.name}
              trader={trader}
              index={sectionIndex * 6 + index}
              isActive={activeTraders.has(trader.name)}
              userId={userId}
              loading={loadingTrader === trader.name}
              onCopy={() => handleCopy(trader.name)}
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
            {COPY_TRADER_SECTIONS.map((s, index) => (
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
              {hasPrev ? COPY_TRADER_SECTIONS[sectionIndex - 1].title : "Previous"}
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
              {hasNext ? COPY_TRADER_SECTIONS[sectionIndex + 1].title : "Next"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
