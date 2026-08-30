"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { getUserTransactions } from "@/lib/api/transactions";
import type { TransactionItem, TransactionKind } from "@/lib/supabase/types";
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
} from "@/components/icons";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { formatDepositMethod } from "@/lib/deposit-options";

type Filter = "all" | TransactionKind;

const KIND_ICONS = {
  deposit: ArrowDownToLine,
  withdrawal: ArrowUpFromLine,
  trade: TrendingUp,
} as const;

function formatRowMethod(method: string | null | undefined) {
  if (!method) return "";
  if (method.startsWith("crypto_") || method.startsWith("gift_card_")) {
    return formatDepositMethod(method);
  }
  return method.replace(/_/g, " ");
}

export function TransactionsClient({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TransactionItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      setItems(await getUserTransactions(supabase, userId));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.kind === filter);
  }, [filter, items]);

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: t("transactions.filterAll") },
    { id: "deposit", label: t("transactions.filterDeposits") },
    { id: "withdrawal", label: t("transactions.filterWithdrawals") },
    { id: "trade", label: t("transactions.filterTrades") },
  ];

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
            {t("dashboard.transactions")}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-1">
            {t("transactions.title")}
          </h1>
          <p className="text-sm text-text-tertiary mt-1.5">{t("transactions.subtitle")}</p>
          {!loading && (
            <p className="text-xs text-text-tertiary mt-2">
              {t("transactions.count", { count: visible.length })}
            </p>
          )}
        </div>

        <div className="scroll-tabs flex gap-2">
          {filters.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                filter === tab.id
                  ? "bg-nav-active text-nav-active-text"
                  : "bg-nav-pill text-text-secondary hover:bg-bg-hover"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-text-tertiary">{t("transactions.receipt.viewHint")}</p>

        <div className="coinix-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-text-tertiary">
              <Loader2 className="h-4 w-4" />
              {t("common.loading")}
            </div>
          ) : visible.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-bg-primary text-text-tertiary">
                <Receipt className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-medium text-text-primary">{t("transactions.empty")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((item) => {
                const Icon = KIND_ICONS[item.kind];
                return (
                  <li key={`${item.kind}-${item.id}`}>
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-bg-hover/60"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-primary text-brand">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-text-primary">
                            {t(`transactions.kind.${item.kind}`)}
                            {item.asset ? ` · ${item.asset}` : ""}
                          </p>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="mt-1 text-xs text-text-tertiary">
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
      </div>

      {selected && (
        <TransactionReceiptModal item={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
