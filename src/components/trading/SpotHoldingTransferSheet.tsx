"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { executeTrade, requestSpotHoldingWithdrawal } from "@/lib/api/trading";
import { getWithdrawalEligibility } from "@/lib/api/withdrawals";
import { CryptoIcon } from "@/components/crypto/CryptoIcon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { WithdrawalCodeField } from "@/components/dashboard/WithdrawalUi";
import { CheckCircle, Loader2, Wallet, X } from "@/components/icons";
import { getNetworksForAsset } from "@/lib/withdrawal-options";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { emitDashboardRefresh } from "@/lib/dashboard-live-sync";

type TransferMode = "to_main" | "send_out";

type SpotHoldingTransferSheetProps = {
  open: boolean;
  mode: TransferMode;
  assetSymbol: string;
  assetName: string;
  pairSymbol: string;
  price: number;
  heldQuantity: number;
  userId: string | null;
  onClose: () => void;
  onComplete?: () => void;
};

export function SpotHoldingTransferSheet({
  open,
  mode,
  assetSymbol,
  assetName,
  pairSymbol,
  price,
  heldQuantity,
  userId,
  onClose,
  onComplete,
}: SpotHoldingTransferSheetProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [network, setNetwork] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [withdrawalCode, setWithdrawalCode] = useState("");
  const [hasWithdrawalCode, setHasWithdrawalCode] = useState(false);

  const networks = useMemo(() => getNetworksForAsset(assetSymbol), [assetSymbol]);
  const qty = amount ? parseFloat(amount) : 0;
  const usdValue = qty * price;

  useBodyScrollLock(open && mounted);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setAmount("");
      setWalletAddress("");
      setWithdrawalCode("");
      setNetwork(getNetworksForAsset(assetSymbol)[0] ?? "TRC20");
      setError("");
      setSuccess(false);
      void getWithdrawalEligibility(createClient()).then((eligibility) => {
        setHasWithdrawalCode(Boolean(eligibility.has_withdrawal_code));
      });
      requestAnimationFrame(() => setVisible(true));
      return;
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 320);
    return () => window.clearTimeout(timer);
  }, [open, assetSymbol, mode]);

  function setMaxAmount() {
    if (heldQuantity <= 0) return;
    setAmount(
      heldQuantity < 1 ? heldQuantity.toFixed(6) : heldQuantity.toFixed(4)
    );
  }

  async function handleSubmit() {
    setError("");

    if (!userId) {
      router.push("/login?redirect=%2Fdashboard%2Ftrade");
      return;
    }

    if (!qty || qty <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    if (qty > heldQuantity) {
      setError(`You only hold ${heldQuantity} ${assetSymbol}.`);
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();

      if (mode === "to_main") {
        await executeTrade(supabase, {
          userId,
          asset: pairSymbol,
          type: "sell",
          amount: qty,
          price,
        });
        setSuccess(true);
        emitDashboardRefresh();
        onComplete?.();
        return;
      }

      if (!walletAddress.trim() || walletAddress.trim().length < 10) {
        throw new Error("Enter a valid destination wallet address.");
      }
      if (!hasWithdrawalCode) {
        throw new Error("No withdrawal code assigned");
      }
      if (!withdrawalCode.trim()) {
        throw new Error("Enter your withdrawal code");
      }

      await requestSpotHoldingWithdrawal(supabase, {
        asset: assetSymbol,
        quantity: qty,
        walletAddress: walletAddress.trim(),
        network: network || networks[0] || "TRC20",
        usdAmount: usdValue,
        withdrawalCode: withdrawalCode.trim(),
      });

      setSuccess(true);
      emitDashboardRefresh();
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted || typeof document === "undefined") return null;

  const title =
    mode === "to_main" ? `Move ${assetSymbol} to main balance` : `Send ${assetSymbol} out`;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close transfer"
        className={cn(
          "fixed inset-0 z-[90] bg-black/65 backdrop-blur-[2px] transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
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
              <p className="truncate text-sm font-semibold text-text-primary">{title}</p>
              <p className="text-xs text-text-tertiary">
                Available: {formatNumber(heldQuantity, heldQuantity < 1 ? 6 : 4)} {assetSymbol}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-tertiary hover:bg-bg-hover"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 safe-area-x sm:px-4 sm:py-5">
          {success ? (
            <div className="spot-deposit-step-enter space-y-5 py-4 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green/15 text-green">
                <CheckCircle className="h-8 w-8" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-text-primary">
                  {mode === "to_main" ? "Moved to main balance" : "Send request submitted"}
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-tertiary">
                  {mode === "to_main"
                    ? `${formatNumber(qty, qty < 1 ? 6 : 4)} ${assetSymbol} was sold and ${formatCurrency(usdValue)} was credited to your main balance.`
                    : `Your ${assetSymbol} send request is pending review. Funds were reserved from your spot wallet.`}
                </p>
              </div>
              <Button type="button" className="w-full" onClick={onClose}>
                Done
              </Button>
            </div>
          ) : (
            <div className="spot-deposit-step-enter space-y-4">
              {mode === "to_main" ? (
                <div className="rounded-2xl border border-border bg-bg-primary/60 p-4 text-sm text-text-secondary">
                  <div className="flex items-start gap-3">
                    <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <p>
                      This sells your spot crypto at the current price and credits your{" "}
                      <strong className="text-text-primary">main USD balance</strong>. Spot holdings
                      stay separate from your portfolio total until you move them here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-bg-primary/60 p-4 text-sm text-text-secondary">
                  Send crypto from your spot wallet to an external address. Review typically takes
                  1–24 hours.
                </div>
              )}

              <Input
                id="transfer-amount"
                label={`Amount (${assetSymbol})`}
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={setMaxAmount}
                  className="flex-1 rounded-lg border border-border bg-bg-primary px-2 py-1.5 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover"
                >
                  Max
                </button>
              </div>

              <div className="flex justify-between text-[12px]">
                <span className="text-text-tertiary">
                  {mode === "to_main" ? "You receive" : "Approx. value"}
                </span>
                <span className="font-mono">{formatCurrency(usdValue)}</span>
              </div>

              {mode === "send_out" && (
                <>
                  {networks.length > 1 && (
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                        Network
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {networks.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setNetwork(item)}
                            className={cn(
                              "rounded-lg border px-3 py-1.5 text-xs font-semibold",
                              network === item
                                ? "border-brand bg-brand/10 text-brand"
                                : "border-border text-text-secondary"
                            )}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Input
                    id="transfer-wallet"
                    label="Destination wallet address"
                    type="text"
                    placeholder="Paste wallet address"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                  />
                  <WithdrawalCodeField
                    value={withdrawalCode}
                    hasCode={hasWithdrawalCode}
                    onChange={setWithdrawalCode}
                  />
                </>
              )}

              {error && (
                <p role="alert" className="text-sm text-red">
                  {error}
                </p>
              )}

              <Button
                type="button"
                className="w-full touch-target"
                disabled={
                  submitting ||
                  heldQuantity <= 0 ||
                  (mode === "send_out" && !hasWithdrawalCode)
                }
                onClick={() => void handleSubmit()}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </span>
                ) : mode === "send_out" && !hasWithdrawalCode ? (
                  "No Withdrawal Code Assigned"
                ) : mode === "to_main" ? (
                  "Move to main balance"
                ) : (
                  "Submit send request"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
