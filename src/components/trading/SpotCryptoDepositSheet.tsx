"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { submitDeposit } from "@/lib/api/deposits";
import { CryptoIcon } from "@/components/crypto/CryptoIcon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Check,
  CheckCircle,
  Clock,
  Copy,
  Loader2,
  Search,
  Shield,
  X,
} from "@/components/icons";
import { DEPOSIT_CRYPTO_LABELS } from "@/lib/deposit-options";
import { buildSpotWalletDepositNotes } from "@/lib/spot-wallet-deposits";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { cn, formatCurrency } from "@/lib/utils";

type Step = "form" | "reviewing";

type SpotCryptoDepositSheetProps = {
  open: boolean;
  depositKey: string;
  assetName: string;
  assetSymbol: string;
  walletAddress: string;
  userId: string | null;
  onClose: () => void;
  onSubmitted?: () => void;
};

export function SpotCryptoDepositSheet({
  open,
  depositKey,
  assetName,
  assetSymbol,
  walletAddress,
  userId,
  onClose,
  onSubmitted,
}: SpotCryptoDepositSheetProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedAmount, setSubmittedAmount] = useState<number | null>(null);

  useBodyScrollLock(open && mounted);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setStep("form");
      setError("");
      setCopied(false);
      setSubmittedAmount(null);
      requestAnimationFrame(() => setVisible(true));
      return;
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 320);
    return () => window.clearTimeout(timer);
  }, [open, depositKey]);

  const addressReady = Boolean(walletAddress && walletAddress.trim() !== "Unavailable");

  function copyAddress() {
    if (!walletAddress) return;
    void navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit() {
    setError("");

    if (!userId) {
      router.push("/login?redirect=%2Fdashboard%2Ftrade");
      return;
    }

    const value = parseFloat(amount);
    if (!value || value < 50) {
      setError("Minimum deposit is $50 USD equivalent.");
      return;
    }

    if (!addressReady) {
      setError("Wallet address unavailable. Contact support.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      await submitDeposit(supabase, {
        userId,
        amount: value,
        method: `crypto_${depositKey}`,
        notes: buildSpotWalletDepositNotes(DEPOSIT_CRYPTO_LABELS[depositKey] ?? assetName),
      });
      setSubmittedAmount(value);
      setStep("reviewing");
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit deposit.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close deposit"
        className={cn(
          "fixed inset-0 z-[90] bg-black/65 backdrop-blur-[2px] transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Deposit ${assetName}`}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[91] mx-auto flex w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-border bg-bg-secondary shadow-2xl",
          "max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-bottom)-0.5rem))] pb-[max(0.25rem,var(--safe-bottom))]",
          visible ? "spot-deposit-sheet-enter" : "translate-y-full opacity-0"
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 safe-area-x">
          <div className="flex min-w-0 items-center gap-3">
            <CryptoIcon symbol={assetSymbol} label={assetName} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">
                Deposit {assetName}
              </p>
              <p className="text-xs text-text-tertiary">Spot wallet · {assetSymbol}</p>
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 safe-area-x sm:px-4 sm:py-5">
          {step === "form" ? (
            <div key="form" className="spot-deposit-step-enter space-y-4">
              <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
                    <Shield className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Send only {assetSymbol}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-tertiary">
                      Send {assetName} to the address below. Once sent, enter the USD value and submit
                      for review. Approved deposits are credited to your spot crypto wallet.
                    </p>
                  </div>
                </div>
              </div>

              <Input
                id="spot-deposit-amount"
                label="Amount sent (USD equivalent)"
                type="number"
                placeholder="1000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  {assetName} deposit address
                </label>
                {addressReady ? (
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-bg-primary p-4">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                      <div className="spot-deposit-scan-line absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-brand/10 to-transparent" />
                    </div>
                    <code className="relative block break-all font-mono text-[12px] leading-relaxed text-text-primary">
                      {walletAddress}
                    </code>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="relative mt-3 w-full gap-2"
                      onClick={copyAddress}
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green" />
                          Address copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy address
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="rounded-2xl border border-border bg-bg-primary p-4 text-sm text-text-tertiary">
                    Wallet address unavailable for this asset. Contact support.
                  </p>
                )}
              </div>

              {error && (
                <p role="alert" className="text-sm text-red">
                  {error}
                </p>
              )}

              <Button
                type="button"
                className="w-full touch-target"
                disabled={submitting || !addressReady}
                onClick={() => void handleSubmit()}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  "I've sent it — Submit for review"
                )}
              </Button>

              <p className="text-center text-[11px] leading-relaxed text-text-tertiary">
                Typical review time: 1–24 hours · Minimum $50
              </p>
            </div>
          ) : (
            <div key="reviewing" className="spot-deposit-step-enter space-y-5 py-2 text-center">
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                <span className="spot-deposit-pulse-ring absolute inset-0 rounded-full bg-brand/20" />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand/15 text-brand">
                  <Search className="h-7 w-7" />
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-text-primary">Under review</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-text-tertiary">
                  Your {assetSymbol} deposit
                  {submittedAmount !== null ? ` of ${formatCurrency(submittedAmount)}` : ""} is being
                  verified by our team. You&apos;ll receive a notification once it&apos;s approved.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-bg-primary p-4 text-left">
                <ol className="space-y-3">
                  {[
                    { label: "Deposit submitted", done: true, icon: CheckCircle },
                    { label: "Team verification in progress", done: false, active: true, icon: Clock },
                    { label: "Credited to your spot wallet", done: false, icon: Shield },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.label} className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            item.done
                              ? "bg-green/15 text-green"
                              : item.active
                                ? "bg-brand/15 text-brand"
                                : "bg-bg-hover text-text-tertiary"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span
                          className={cn(
                            "text-sm",
                            item.active ? "font-semibold text-text-primary" : "text-text-secondary"
                          )}
                        >
                          {item.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <Button type="button" className="w-full" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
