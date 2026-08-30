"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import {
  eventFromProfitCredit,
  type CopyTradingProfitCreditRow,
  type CopyTradingProfitEvent,
} from "@/lib/copy-trading-profit";
import {
  getPendingCopyProfitOverlays,
  markCopyProfitOverlayShown,
} from "@/lib/api/copy-trading";
import { emitDashboardRefresh } from "@/lib/dashboard-live-sync";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { formatCurrency } from "@/lib/utils";
import { Check, Copy, TrendingUp } from "@/components/icons";

const TICKERS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "XRP/USDT", "EUR/USD"];

function CopyTradingProfitOverlay({
  event,
  onDone,
}: {
  event: CopyTradingProfitEvent;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [displayAmount, setDisplayAmount] = useState(0);
  const [phase, setPhase] = useState(0);
  useBodyScrollLock(true);

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const start = performance.now();
    const duration = 1400;
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayAmount(event.amount * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [event.amount]);

  useEffect(() => {
    const statusTimer = window.setInterval(() => setPhase((p) => (p + 1) % 3), 1800);
    const closeTimer = window.setTimeout(() => onDoneRef.current(), 5200);
    return () => {
      window.clearInterval(statusTimer);
      window.clearTimeout(closeTimer);
    };
  }, []);

  const statusLines = [
    t("copyTrading.profitOverlayScanning"),
    t("copyTrading.profitOverlayMirroring"),
    t("copyTrading.profitOverlaySettled"),
  ];

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm safe-area-x safe-area-bottom"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="copy-profit-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--decko-accent)]/30 bg-bg-secondary shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
      >
        <div className="border-b border-border/80 bg-gradient-to-r from-[var(--decko-accent)]/15 via-bg-secondary to-bg-secondary px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--decko-accent)] text-[#111111]">
              <Copy className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
                {t("copyTrading.profitOverlayEyebrow")}
              </p>
              <h2 id="copy-profit-title" className="truncate text-lg font-bold text-text-primary">
                {event.traderName}
              </h2>
            </div>
            <motion.span
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-green/15 text-green"
            >
              <TrendingUp className="h-4 w-4" />
            </motion.span>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-2xl border border-border/80 bg-bg-primary/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              {statusLines[phase]}
            </p>
            <div className="mt-3 space-y-2">
              {TICKERS.map((symbol, index) => (
                <motion.div
                  key={symbol}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-bg-secondary/80 px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-text-primary">{symbol}</span>
                  <span className="inline-flex items-center gap-1 font-mono text-green">
                    <Check className="h-3 w-3" />
                    {t("copyTrading.profitOverlayCopied")}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-green/25 bg-green/10 px-4 py-4 text-center">
            <p className="text-xs font-medium text-text-secondary">
              {t("copyTrading.profitOverlayCredited")}
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-green">
              +{formatCurrency(displayAmount)}
            </p>
            <p className="mt-2 text-[11px] text-text-tertiary">
              {t("copyTrading.profitOverlayBalanceHint")}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

export function CopyTradingProfitProvider({
  userId,
  children,
}: {
  userId?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState<CopyTradingProfitEvent[]>([]);
  const queuedIds = useRef(new Set<string>());

  const refreshDashboard = useCallback(() => {
    router.refresh();
    emitDashboardRefresh();
  }, [router]);

  const enqueue = useCallback((event: CopyTradingProfitEvent) => {
    if (queuedIds.current.has(event.id)) return;
    queuedIds.current.add(event.id);
    setQueue((prev) => [...prev, event]);
  }, []);

  const handleDone = useCallback(async (creditId: string) => {
    try {
      const supabase = createClient();
      await markCopyProfitOverlayShown(supabase, creditId);
    } catch {
      /* still dismiss so the user is not stuck */
    }

    setQueue((prev) => prev.filter((item) => item.id !== creditId));
    refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    let cancelled = false;

    void getPendingCopyProfitOverlays(supabase, userId).then((pending) => {
      if (cancelled) return;
      pending.forEach((event) => enqueue(event));
    });

    const channel = supabase
      .channel(`dashboard-live-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "copy_trading_profit_credits",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as CopyTradingProfitCreditRow;
          const parsed = eventFromProfitCredit(row);
          if (!parsed) return;
          refreshDashboard();
          enqueue(parsed);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          refreshDashboard();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "balances",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refreshDashboard();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "copy_trading_subscriptions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refreshDashboard();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [enqueue, refreshDashboard, userId]);

  const event = queue[0] ?? null;

  return (
    <>
      {children}
      <AnimatePresence mode="wait">
        {event && (
          <CopyTradingProfitOverlay key={event.id} event={event} onDone={() => void handleDone(event.id)} />
        )}
      </AnimatePresence>
    </>
  );
}
