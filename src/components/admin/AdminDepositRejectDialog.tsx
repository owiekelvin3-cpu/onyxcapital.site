"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { cn, formatCurrency } from "@/lib/utils";
import {
  CUSTOM_DEPOSIT_REJECTION_REASON_ID,
  DEPOSIT_REJECTION_REASONS,
  getDepositRejectionReasonText,
} from "@/lib/deposit-rejection-reasons";
import { X } from "@/components/icons";

export function AdminDepositRejectDialog({
  open,
  amount,
  userLabel,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  amount: number;
  userLabel: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reasonId, setReasonId] = useState<
    (typeof DEPOSIT_REJECTION_REASONS)[number]["id"] | typeof CUSTOM_DEPOSIT_REJECTION_REASON_ID
  >(DEPOSIT_REJECTION_REASONS[0].id);
  const [customReason, setCustomReason] = useState("");

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setReasonId(DEPOSIT_REJECTION_REASONS[0].id);
    setCustomReason("");
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const resolvedReason = getDepositRejectionReasonText(reasonId, customReason);
  const canSubmit = resolvedReason.length >= 8;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-deposit-title"
        className="relative z-[1] flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-bg-secondary shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id="reject-deposit-title" className="text-base font-semibold text-text-primary">
              Reject deposit
            </h2>
            <p className="mt-1 text-xs text-text-tertiary">
              {formatCurrency(amount)} · {userLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-3 text-xs font-medium text-text-secondary">
            Select a reason, or write your own. The client will receive this explanation.
          </p>
          <div className="space-y-2">
            {DEPOSIT_REJECTION_REASONS.map((reason) => (
              <label
                key={reason.id}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border px-3 py-3 transition-colors",
                  reasonId === reason.id
                    ? "border-brand/40 bg-brand/5"
                    : "border-border bg-bg-primary/60 hover:border-border-light"
                )}
              >
                <input
                  type="radio"
                  name="deposit-rejection-reason"
                  className="mt-1"
                  checked={reasonId === reason.id}
                  onChange={() => setReasonId(reason.id)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-text-primary">{reason.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-text-tertiary">
                    {reason.text}
                  </span>
                </span>
              </label>
            ))}

            <label
              className={cn(
                "flex cursor-pointer gap-3 rounded-xl border px-3 py-3 transition-colors",
                reasonId === CUSTOM_DEPOSIT_REJECTION_REASON_ID
                  ? "border-brand/40 bg-brand/5"
                  : "border-border bg-bg-primary/60 hover:border-border-light"
              )}
            >
              <input
                type="radio"
                name="deposit-rejection-reason"
                className="mt-1"
                checked={reasonId === CUSTOM_DEPOSIT_REJECTION_REASON_ID}
                onChange={() => setReasonId(CUSTOM_DEPOSIT_REJECTION_REASON_ID)}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-text-primary">Write a custom reason</span>
                <span className="mt-0.5 block text-xs text-text-tertiary">
                  Use this if none of the standard reasons apply.
                </span>
                {reasonId === CUSTOM_DEPOSIT_REJECTION_REASON_ID && (
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    rows={4}
                    placeholder="Enter the explanation that will be sent to the client…"
                    className="mt-3 w-full rounded-xl border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-brand"
                  />
                )}
              </span>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || !canSubmit}
            onClick={() => onConfirm(resolvedReason)}
          >
            {busy ? "Rejecting…" : "Confirm rejection"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
