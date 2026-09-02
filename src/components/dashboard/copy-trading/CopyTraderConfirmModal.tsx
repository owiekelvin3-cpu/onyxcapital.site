"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowDownToLine, Loader2, X } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import type { CopyTraderProfile } from "@/lib/copy-traders";
import { formatCurrency } from "@/lib/utils";

export function CopyTraderConfirmModal({
  trader,
  balance,
  busy,
  onClose,
  onConfirm,
}: {
  trader: CopyTraderProfile;
  balance: number;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const price = Number(trader.price);
  const canAfford = balance >= price && price > 0;
  const shortfall = Math.max(0, price - balance);

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
      aria-labelledby="copy-confirm-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label={t("copyTrading.cancel")}
      />
      <div className="absolute inset-x-0 bottom-0 z-10 sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4">
        <div className="flex max-h-[min(85dvh,calc(100dvh-var(--safe-bottom)))] flex-col overflow-hidden rounded-t-3xl border border-border bg-bg-secondary shadow-[var(--shadow-card)] safe-area-bottom sm:rounded-2xl">
          <div className="overflow-y-auto p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 id="copy-confirm-title" className="pr-2 text-lg font-bold text-text-primary">
                {t("copyTrading.confirmTitle")}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-xl p-2 text-text-tertiary hover:bg-bg-hover hover:text-text-primary touch-manipulation"
                aria-label={t("copyTrading.cancel")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              {t("copyTrading.confirmBody", {
                name: trader.name,
                price: formatCurrency(price),
              })}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-border bg-bg-primary/60 p-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-tertiary">
                  {t("copyTrading.allocation")}
                </p>
                <p className="text-sm font-bold tabular-nums text-text-primary">{formatCurrency(price)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-tertiary">
                  {t("copyTrading.balance")}
                </p>
                <p className="text-sm font-bold tabular-nums text-text-primary">{formatCurrency(balance)}</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-text-tertiary">{t("copyTrading.riskBody")}</p>
            {!canAfford && (
              <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-200">
                {t("copyTrading.needMore", { amount: formatCurrency(shortfall) })}
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
                {t("copyTrading.cancel")}
              </Button>
              {canAfford ? (
                <Button
                  type="button"
                  size="lg"
                  className="w-full touch-manipulation sm:flex-1"
                  disabled={busy}
                  onClick={onConfirm}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("copyTrading.payAndCopy", { price: formatCurrency(price) })
                  )}
                </Button>
              ) : (
                <Link href="/dashboard/deposit" className="w-full sm:flex-1" onClick={onClose}>
                  <Button type="button" size="lg" className="w-full touch-manipulation">
                    <ArrowDownToLine className="h-4 w-4" />
                    {t("copyTrading.depositToCopy")}
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
