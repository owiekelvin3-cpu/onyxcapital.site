"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TransactionItem } from "@/lib/supabase/types";
import { formatDepositMethod } from "@/lib/deposit-options";
import { formatSpotWalletDepositNotes } from "@/lib/spot-wallet-deposits";
import { transactionStatusTone } from "@/lib/api/transactions";
import { X } from "@/components/icons";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const tone = transactionStatusTone(status);
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone === "up" && "bg-green/10 text-green",
        tone === "down" && "bg-red/10 text-red",
        tone === "pending" && "bg-amber-500/10 text-amber-600 dark:text-amber-300",
        tone === "default" && "bg-bg-hover text-text-tertiary"
      )}
    >
      {status}
    </span>
  );
}

function formatTransactionMethod(method: string | null | undefined): string | null {
  if (!method) return null;
  if (method.startsWith("crypto_") || method.startsWith("gift_card_")) {
    return formatDepositMethod(method);
  }
  return method.replace(/_/g, " ");
}

function formatTransactionNotes(notes: string | null | undefined): string | null {
  const spotDeposit = formatSpotWalletDepositNotes(notes);
  if (spotDeposit) return spotDeposit;

  if (!notes?.trim()) return null;

  try {
    const parsed = JSON.parse(notes) as Record<string, unknown>;
    if (parsed.spot_holding_withdrawal) {
      const asset = String(parsed.asset ?? "");
      const quantity = parsed.quantity != null ? formatNumber(Number(parsed.quantity), 6) : "";
      const network = parsed.network ? String(parsed.network) : "";
      return ["Spot wallet send-out", asset && quantity ? `${quantity} ${asset}` : null, network]
        .filter(Boolean)
        .join(" · ");
    }
    if (typeof parsed === "object" && parsed !== null) {
      return Object.entries(parsed)
        .map(([key, value]) => `${key.replace(/_/g, " ")}: ${String(value)}`)
        .join(" · ");
    }
  } catch {
    // plain text notes
  }

  return notes;
}

export function TransactionReceiptModal({
  item,
  onClose,
}: {
  item: TransactionItem;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const methodLabel = formatTransactionMethod(item.method);
  const notesLabel = formatTransactionNotes(item.notes);
  const assetLabel = item.asset?.includes("/") ? item.asset.split("/")[0] : item.asset;

  useBodyScrollLock(mounted);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label={t("transactions.receipt.close")}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("transactions.receipt.title")}
        className="relative flex max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-bottom)-1rem))] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-bg-secondary shadow-2xl safe-area-bottom sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-accent)]">
              {t(`transactions.kind.${item.kind}`)}
            </p>
            <h2 className="mt-1 text-lg font-bold text-text-primary">
              {t("transactions.receipt.title")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
            aria-label={t("transactions.receipt.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-tertiary">{t("transactions.receipt.amount")}</dt>
              <dd className="font-mono font-semibold text-text-primary">
                {formatCurrency(item.amount)}
                {item.currency ? ` ${item.currency}` : ""}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-tertiary">{t("transactions.receipt.type")}</dt>
              <dd className="font-medium capitalize text-text-primary">
                {t(`transactions.kind.${item.kind}`)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-tertiary">{t("common.status")}</dt>
              <dd>
                <StatusBadge status={item.status} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-tertiary">{t("transactions.receipt.date")}</dt>
              <dd className="text-text-primary">{formatDate(item.created_at)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-tertiary">{t("transactions.receipt.updated")}</dt>
              <dd className="text-text-primary">{formatDate(item.updated_at)}</dd>
            </div>
            {methodLabel && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-text-tertiary">{t("transactions.receipt.method")}</dt>
                <dd className="text-right text-text-primary">{methodLabel}</dd>
              </div>
            )}
            {assetLabel && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-text-tertiary">{t("transactions.receipt.asset")}</dt>
                <dd className="font-medium text-text-primary">{assetLabel}</dd>
              </div>
            )}
            {item.tradeType && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-text-tertiary">{t("transactions.receipt.tradeType")}</dt>
                <dd className="capitalize text-text-primary">{item.tradeType}</dd>
              </div>
            )}
            {item.quantity != null && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-text-tertiary">{t("transactions.receipt.quantity")}</dt>
                <dd className="font-mono text-text-primary">
                  {formatNumber(item.quantity, item.quantity < 1 ? 6 : 4)}
                  {assetLabel ? ` ${assetLabel}` : ""}
                </dd>
              </div>
            )}
            {item.unitPrice != null && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-text-tertiary">{t("transactions.receipt.unitPrice")}</dt>
                <dd className="font-mono text-text-primary">{formatCurrency(item.unitPrice)}</dd>
              </div>
            )}
            {item.destination && (
              <div className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-text-tertiary">{t("transactions.receipt.destination")}</dt>
                <dd className="break-all text-right font-mono text-text-primary">{item.destination}</dd>
              </div>
            )}
            {notesLabel && (
              <div className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-text-tertiary">{t("transactions.receipt.notes")}</dt>
                <dd className="break-words text-right text-text-primary">{notesLabel}</dd>
              </div>
            )}
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-text-tertiary">{t("transactions.receipt.reference")}</dt>
              <dd className="break-all text-right font-mono text-[11px] text-text-secondary">{item.id}</dd>
            </div>
          </dl>

          <p className="mt-5 border-t border-border pt-4 text-[11px] leading-relaxed text-text-tertiary">
            {t("transactions.receipt.footer")}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
