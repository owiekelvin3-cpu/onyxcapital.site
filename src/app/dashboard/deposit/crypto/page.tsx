"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getDepositConfig,
  getUserDeposits,
  submitCryptoDeposit,
  type DepositConfig,
} from "@/lib/api/deposits";
import { getPendingUserFees, sumPendingFees } from "@/lib/api/fees";
import type { DepositRow } from "@/lib/supabase/types";
import { DEPOSIT_CRYPTO_LABELS, DEPOSIT_CRYPTO_KEYS, formatDepositMethod } from "@/lib/deposit-options";
import { CryptoIcon } from "@/components/crypto/CryptoIcon";
import { cn, formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertTriangle, ArrowLeft, Check, Copy, Image as ImageIcon, Loader2 } from "@/components/icons";
import { ImageUploadField } from "@/components/dashboard/deposit/ImageUploadField";
import { parseDepositNotes, depositNotesHaveImages } from "@/lib/deposit-details";

export default function CryptoDepositPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const feeIdParam = searchParams.get("feeId");
  const amountParam = searchParams.get("amount");
  const assetParam = searchParams.get("asset");
  const fromTrade = searchParams.get("from") === "trade";
  const [config, setConfig] = useState<DepositConfig | null>(null);
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState("bitcoin");
  const [amount, setAmount] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingFeesTotal, setPendingFeesTotal] = useState(0);
  const [relatedFeeId, setRelatedFeeId] = useState<string | null>(null);
  const [feePrefilled, setFeePrefilled] = useState(false);

  useEffect(() => {
    if (assetParam && DEPOSIT_CRYPTO_KEYS.includes(assetParam)) {
      setSelected(assetParam);
    }
  }, [assetParam]);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const cfg = await getDepositConfig(supabase);
      setConfig(cfg);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const rows = await getUserDeposits(supabase, user.id);
        setDeposits(rows);

        try {
          const fees = await getPendingUserFees(supabase, user.id);
          const total = sumPendingFees(fees);
          setPendingFeesTotal(total);

          const matchedFee = feeIdParam ? fees.find((f) => f.id === feeIdParam) : fees[0];
          if (matchedFee) {
            setRelatedFeeId(matchedFee.id);
          } else if (feeIdParam) {
            setRelatedFeeId(feeIdParam);
          }

          if (!feePrefilled && (amountParam || total > 0)) {
            const suggested = amountParam ? parseFloat(amountParam) : total;
            if (Number.isFinite(suggested) && suggested > 0) {
              setAmount(suggested.toFixed(2));
              setFeePrefilled(true);
            }
          }
        } catch {
          setPendingFeesTotal(0);
        }
      }
      setLoading(false);
    }
    load();
  }, [amountParam, feeIdParam, feePrefilled]);

  const walletAddress = config?.cryptoWallets?.[selected] ?? "";

  function copyAddress() {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit() {
    setError("");
    setSuccess("");

    if (!userId) {
      router.push("/login");
      return;
    }

    const value = parseFloat(amount);
    if (!value || value < 50) {
      setError("Minimum deposit is $50");
      return;
    }
    if (!proofImage) {
      setError("Upload a screenshot of your payment to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const row = await submitCryptoDeposit(supabase, {
        userId,
        amount: value,
        method: `crypto_${selected}`,
        summary: relatedFeeId
          ? `Withdrawal fee deposit (${DEPOSIT_CRYPTO_LABELS[selected] ?? selected})`
          : `Deposit via ${DEPOSIT_CRYPTO_LABELS[selected] ?? selected}`,
        proofImage,
        txHash,
        relatedFeeId: relatedFeeId ?? undefined,
      });
      setDeposits((prev) => [row, ...prev]);
      setAmount("");
      setProofImage(null);
      setTxHash("");
      setSuccess(
        relatedFeeId
          ? "Deposit request submitted. Once approved, your withdrawal fee will be cleared automatically."
          : "Deposit request submitted. Pending team review."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <Link
          href={fromTrade ? "/dashboard" : "/dashboard/deposit"}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" />
          {fromTrade ? "Back to dashboard" : "All deposit methods"}
        </Link>
        <h1 className="text-lg font-bold text-text-primary">Cryptocurrency</h1>
        <p className="text-[13px] text-text-tertiary mt-1">
          Send crypto to our wallet address, then upload a screenshot of the payment for verification.
        </p>
      </div>

      {pendingFeesTotal > 0 && (
        <div className="rounded-2xl border border-brand/25 bg-brand/5 p-4 flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
            <AlertTriangle className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">Paying a withdrawal fee</p>
            <p className="text-xs text-text-tertiary mt-1 leading-relaxed">
              Deposit at least {formatCurrency(pendingFeesTotal)} to clear your fee. This cannot be paid from
              your existing balance — the fee is deducted only after this deposit is approved.
            </p>
            <Link
              href="/dashboard/withdraw"
              className="inline-block mt-2 text-xs font-medium text-brand hover:text-brand-hover"
            >
              View fee details on Withdraw
            </Link>
          </div>
        </div>
      )}

      <Card>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-text-tertiary mb-2">Select Asset</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.keys(DEPOSIT_CRYPTO_LABELS).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border px-2 py-3 transition-colors cursor-pointer",
                    selected === key
                      ? "bg-brand/10 text-brand border-brand/40"
                      : "bg-bg-primary text-text-secondary border-border hover:text-text-primary hover:bg-bg-hover/40"
                  )}
                >
                  <CryptoIcon symbol={key} label={DEPOSIT_CRYPTO_LABELS[key]} size="md" selected={selected === key} />
                  <span className="text-[11px] font-semibold text-center leading-tight">
                    {DEPOSIT_CRYPTO_LABELS[key].split(" (")[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Input
            id="amount"
            label="Amount (USD equivalent)"
            type="number"
            placeholder="1000.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          {loading ? (
            <p className="text-[13px] text-text-tertiary">Loading wallet...</p>
          ) : walletAddress && walletAddress.trim() !== "Unavailable" ? (
            <div>
              <label className="block text-xs text-text-tertiary mb-2">
                Deposit Address — {DEPOSIT_CRYPTO_LABELS[selected]}
              </label>
              <div className="flex items-center gap-2 bg-bg-primary border border-border rounded p-3">
                <code className="flex-1 text-[11px] font-mono break-all text-text-secondary">
                  {walletAddress}
                </code>
                <button
                  type="button"
                  onClick={copyAddress}
                  className="p-2 text-text-tertiary hover:text-brand transition-colors cursor-pointer shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-green" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-text-tertiary">
              Wallet address unavailable for this asset. Contact support.
            </p>
          )}

          <ImageUploadField
            id="deposit-proof"
            label="Proof of payment"
            required
            value={proofImage}
            onChange={setProofImage}
            hint="After you send the payment, upload a screenshot of the transfer or transaction."
          />

          <Input
            id="tx-hash"
            label="Transaction hash (optional)"
            placeholder="Paste your transaction ID"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            className="font-mono"
          />

          {error && (
            <p role="alert" className="text-[13px] text-red">
              {error}
            </p>
          )}
          {success && <p className="text-[13px] text-green">{success}</p>}

          <Button type="button" className="w-full" disabled={submitting || !userId || !proofImage} onClick={handleSubmit}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              "Submit Deposit Request"
            )}
          </Button>

          <p className="text-[11px] text-text-tertiary leading-relaxed">
            Deposits are typically confirmed within 1–24 hours after team approval. Minimum deposit: $50.
            Include a clear screenshot of the completed payment.
          </p>
        </div>
      </Card>

      {deposits.length > 0 && (
        <CollapsibleSection
          title="Deposit History"
          subtitle={`${deposits.length} recent ${deposits.length === 1 ? "request" : "requests"}`}
        >
          <div className="space-y-2">
            {deposits.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 text-[13px]"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-medium">
                    {formatCurrency(d.amount)}
                    {depositNotesHaveImages(parseDepositNotes(d.notes, d.method)) && (
                      <ImageIcon className="h-3.5 w-3.5 text-brand" aria-label="Proof attached" />
                    )}
                  </p>
                  <p className="text-[11px] text-text-tertiary capitalize">
                    {formatDepositMethod(d.method)} · {d.status}
                  </p>
                  {d.status === "rejected" && d.rejection_reason && (
                    <p className="mt-1 text-[11px] text-red line-clamp-2">
                      Reason: {d.rejection_reason}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-[11px] text-text-tertiary">
                  {new Date(d.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
