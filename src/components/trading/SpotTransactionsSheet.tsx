"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import {
  filterSpotTransactions,
  getUserTransactions,
  transactionStatusTone,
} from "@/lib/api/transactions";
import type { TransactionItem } from "@/lib/supabase/types";
import {
  StatusBadge,
  TransactionReceiptModal,
} from "@/components/dashboard/TransactionReceiptModal";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  Receipt,
  TrendingUp,
  X,
} from "@/components/icons";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { formatDepositMethod } from "@/lib/deposit-options";
import { DASHBOARD_REFRESH_EVENT } from "@/lib/dashboard-live-sync";

type TxFilter = "all" | "pending" | "completed";

const KIND_ICONS = {
  deposit: ArrowDownToLine,
  withdrawal: ArrowUpFromLine,
  trade: TrendingUp,
} as const;

const FILTERS: { id: TxFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "completed", label: "Successful" },
];

function matchesFilter(item: TransactionItem, filter: TxFilter) {
  const tone = transactionStatusTone(item.status);
  if (filter === "pending") return tone === "pending";
  if (filter === "completed") return tone === "up";
  return true;
}

function formatRowMethod(method: string | null | undefined) {
  if (!method) return "";
  if (method.startsWith("crypto_") || method.startsWith("gift_card_")) {
    return formatDepositMethod(method);
  }
  return method.replace(/_/g, " ");
}

export function SpotTransactionsSheet({
  open,
  userId,
  onClose,
}: {
  open: boolean;
  userId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [filter, setFilter] = useState<TxFilter>("all");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TransactionItem | null>(null);

  useBodyScrollLock(open && mounted);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const rows = await getUserTransactions(supabase, userId, 40);
      setItems(filterSpotTransactions(rows));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
      void load();
      return;
    }

    setVisible(false);
    setSelected(null);
    const timer = window.setTimeout(() => setMounted(false), 320);
    return () => window.clearTimeout(timer);
  }, [open, load]);

  useEffect(() => {
    if (!open || !userId) return;
    const reload = () => void load();
    window.addEventListener(DASHBOARD_REFRESH_EVENT, reload);
    return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, reload);
  }, [load, open, userId]);

  const visibleItems = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [filter, items]
  );

  const pendingCount = useMemo(
    () => items.filter((item) => transactionStatusTone(item.status) === "pending").length,
    [items]
  );

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close spot transactions"
        className={cn(
          "fixed inset-0 z-[90] bg-black/65 backdrop-blur-[2px] transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Spot wallet transactions"
        className={cn(
          "fixed inset-x-0 bottom-0 z-[91] mx-auto flex w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-border bg-bg-secondary shadow-2xl",
          "max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-bottom)-0.5rem))] pb-[max(0.25rem,var(--safe-bottom))]",
          visible ? "spot-deposit-sheet-enter" : "translate-y-full opacity-0"
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 safe-area-x">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-accent)]/15 text-[var(--brand-accent)]">
              <Receipt className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">Spot transactions</p>
              <p className="text-xs text-text-tertiary">
                {pendingCount > 0
                  ? `${pendingCount} pending · deposits, trades, send-outs`
                  : "Deposits, trades, and send-outs"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-border px-4 py-3 safe-area-x">
          <div className="flex gap-2">
            {FILTERS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors touch-target",
                  filter === tab.id
                    ? "bg-nav-active text-nav-active-text"
                    : "bg-nav-pill text-text-secondary hover:bg-bg-hover"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain safe-area-x">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-text-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.loading")}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-bg-primary text-text-tertiary">
                <Receipt className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-medium text-text-primary">
                {filter === "pending"
                  ? "No pending spot transactions"
                  : filter === "completed"
                    ? "No successful spot transactions yet"
                    : "No spot wallet activity yet"}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                Deposits, trades, and send-outs from this wallet appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {visibleItems.map((item) => {
                const Icon = KIND_ICONS[item.kind];
                return (
                  <li key={`${item.kind}-${item.id}`}>
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-bg-hover/60 touch-target"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-primary text-brand">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-text-primary">
                            {t(`transactions.kind.${item.kind}`)}
                            {item.asset ? ` · ${item.asset.split("/")[0]}` : ""}
                          </p>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="mt-0.5 text-xs text-text-tertiary">
                          {formatDate(item.created_at)}
                          {item.method ? ` · ${formatRowMethod(item.method)}` : ""}
                          {item.tradeType ? ` · ${item.tradeType}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-mono font-semibold tabular-nums text-text-primary">
                          {formatCurrency(item.amount)}
                        </p>
                        <p className="text-[11px] font-semibold text-[var(--brand-accent)]">
                          {t("transactions.viewReceipt")}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-4 py-3 safe-area-x">
          <Link
            href="/dashboard/transactions"
            onClick={onClose}
            className="flex min-h-11 items-center justify-center rounded-xl border border-border bg-bg-primary text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover touch-target"
          >
            View all transactions
          </Link>
        </div>
      </div>

      {selected && <TransactionReceiptModal item={selected} onClose={() => setSelected(null)} />}
    </>,
    document.body
  );
}
