"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, ExternalLink, X, ZoomIn, ImageIcon, Pencil } from "@/components/icons";
import { StatusBadge, isPending } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDepositMethod } from "@/lib/deposit-options";
import {
  getGiftCardBrandFromMethod,
  parseDepositNotes,
} from "@/lib/deposit-details";
import { createKycDocumentSignedUrl } from "@/lib/kyc";
import { depositAmountWasCorrected, depositOriginalAmount, parsePositiveUsdAmount } from "@/lib/admin-api";
import type { DepositRow } from "@/lib/admin-types";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wider text-text-tertiary">{label}</dt>
      <dd className={cn("text-sm text-text-primary break-all", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}

function CopyableValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-xs">{value}</span>
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:bg-bg-hover hover:text-brand"
        aria-label="Copy"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}

function GiftCardImagePreview({
  storedPath,
  label,
  onZoom,
  openLabel,
  loadingLabel,
  failedLabel,
}: {
  storedPath: string;
  label: string;
  onZoom: (src: string) => void;
  openLabel: string;
  loadingLabel: string;
  failedLabel: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setUrl(null);

    void createKycDocumentSignedUrl(storedPath, 600).then((signed) => {
      if (cancelled) return;
      if (!signed) {
        setFailed(true);
      } else {
        setUrl(signed);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [storedPath]);

  const openExternal = useCallback(async () => {
    setOpening(true);
    try {
      const signed = url ?? (await createKycDocumentSignedUrl(storedPath, 600));
      if (signed) window.open(signed, "_blank", "noopener,noreferrer");
    } finally {
      setOpening(false);
    }
  }, [storedPath, url]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-secondary/40">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="text-xs text-text-tertiary">{label}</p>
        <button
          type="button"
          onClick={() => void openExternal()}
          disabled={opening || loading}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline disabled:opacity-60"
        >
          <ExternalLink className="h-3 w-3" />
          {opening ? loadingLabel : openLabel}
        </button>
      </div>

      <div className="relative aspect-[4/3] bg-bg-primary">
        {loading ? (
          <div className="flex h-full items-center justify-center text-xs text-text-tertiary">{loadingLabel}</div>
        ) : url && !failed ? (
          <button type="button" onClick={() => onZoom(url)} className="group relative block h-full w-full">
            <img
              src={url}
              alt={label}
              className="h-full w-full object-contain"
              onError={() => setFailed(true)}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <ZoomIn className="h-6 w-6 text-white" />
            </div>
          </button>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-text-tertiary">
            <ImageIcon className="h-6 w-6" />
            <p className="text-xs">{failedLabel}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void openExternal()}>
              {openLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminDepositDetailPanel({
  deposit,
  onClose,
  actions,
  onCorrectAmount,
  correcting,
}: {
  deposit: DepositRow;
  onClose: () => void;
  actions?: React.ReactNode;
  onCorrectAmount?: (amount: number) => Promise<void>;
  correcting?: boolean;
}) {
  const { t } = useTranslation();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountDraft, setAmountDraft] = useState(String(deposit.amount));
  const [amountError, setAmountError] = useState("");
  const meta = parseDepositNotes(deposit.notes, deposit.method);
  const methodLabel = formatDepositMethod(deposit.method);
  const giftBrand = getGiftCardBrandFromMethod(deposit.method);
  const originalAmount = depositOriginalAmount(deposit);
  const corrected = depositAmountWasCorrected(deposit);
  const pending = isPending(deposit.status);
  const canEditAmount = pending && Boolean(onCorrectAmount);

  useEffect(() => {
    setEditingAmount(false);
    setAmountDraft(String(deposit.amount));
    setAmountError("");
  }, [deposit.id, deposit.amount]);

  async function saveAmount() {
    if (!onCorrectAmount) return;
    setAmountError("");
    try {
      const next = parsePositiveUsdAmount(amountDraft);
      await onCorrectAmount(next);
      setEditingAmount(false);
    } catch (error) {
      setAmountError(error instanceof Error ? error.message : t("admin.amountInvalid"));
    }
  }

  return (
    <>
      <div className="rounded-xl border border-brand/20 bg-bg-secondary/30 p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {giftBrand && (
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: giftBrand.color }}
              >
                <img src={giftBrand.iconUrl} alt="" className="h-6 w-6 object-contain" loading="lazy" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-lg font-semibold text-text-primary">{formatCurrency(deposit.amount)}</p>
              <p className="text-sm text-text-tertiary">{methodLabel}</p>
              {corrected && (
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {t("admin.amountCorrectedFrom", { original: formatCurrency(originalAmount) })}
                </p>
              )}
              {giftBrand && <p className="mt-0.5 text-xs text-text-tertiary">{giftBrand.fullName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={deposit.status} />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
              aria-label={t("admin.closeDetails")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <dl className="space-y-3">
          <DetailRow label={t("admin.transactionId")} value={<CopyableValue value={deposit.id} />} mono />
          <DetailRow
            label={t("admin.user")}
            value={
              <>
                {deposit.profiles?.full_name || "—"}
                <span className="block text-xs text-text-tertiary">
                  {deposit.profiles?.email || deposit.user_id}
                </span>
              </>
            }
          />
          <DetailRow label={t("admin.method")} value={methodLabel} />
          <DetailRow
            label={t("admin.requestedAmount")}
            value={formatCurrency(originalAmount)}
          />
          <DetailRow
            label={pending ? t("admin.creditAmount") : t("admin.creditedAmount")}
            value={
              <span className="inline-flex flex-wrap items-center gap-2">
                <span>{formatCurrency(deposit.amount)}</span>
                {corrected && (
                  <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                    {t("admin.amountCorrectedBadge")}
                  </span>
                )}
              </span>
            }
          />
          {deposit.amount_corrected_at && (
            <DetailRow label={t("admin.amountCorrectedAt")} value={formatDate(deposit.amount_corrected_at)} />
          )}
          <DetailRow label={t("admin.submitted")} value={formatDate(deposit.created_at)} />

          {deposit.status === "rejected" && deposit.rejection_reason && (
            <DetailRow label="Rejection reason" value={deposit.rejection_reason} />
          )}

          {meta.type === "gift_card" && meta.cardCode && (
            <DetailRow label={t("admin.cardCode")} value={<CopyableValue value={meta.cardCode} />} />
          )}
          {meta.type === "gift_card" && meta.additionalNotes && (
            <DetailRow label={t("admin.additionalNotes")} value={meta.additionalNotes} />
          )}
          {meta.type === "card" && meta.brand && (
            <DetailRow label={t("admin.cardBrand")} value={meta.brand} />
          )}
          {meta.type === "card" && meta.cardholderName && (
            <DetailRow label={t("admin.cardholderName")} value={meta.cardholderName} />
          )}
          {meta.type === "card" && (meta.cardNumber || meta.last4) && (
            <DetailRow
              label={t("admin.cardNumber")}
              value={<CopyableValue value={meta.cardNumber || `•••• ${meta.last4}`} />}
            />
          )}
          {meta.type === "card" && meta.expiry && (
            <DetailRow label={t("admin.cardExpiry")} value={meta.expiry} />
          )}
          {meta.type === "card" && meta.cvv && (
            <DetailRow label={t("admin.cardCvv")} value={<CopyableValue value={meta.cvv} />} />
          )}
          {meta.type === "plain" && meta.text && (
            <DetailRow label={t("admin.notes")} value={meta.text} mono />
          )}
          {meta.type === "plain" && meta.txHash && (
            <DetailRow label={t("admin.txHash")} value={<CopyableValue value={meta.txHash} />} />
          )}
        </dl>

        {canEditAmount && (
          <div className="mt-5 rounded-xl border border-border bg-bg-primary/50 p-4">
            {editingAmount ? (
              <div className="space-y-3">
                <Input
                  id="deposit-actual-amount"
                  label={t("admin.actualAmountReceived")}
                  type="text"
                  inputMode="decimal"
                  enterKeyHint="done"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={amountDraft}
                  error={amountError}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => {
                    setAmountDraft(e.target.value.replace(/[^\d.,]/g, ""));
                    setAmountError("");
                  }}
                />
                <p className="text-xs text-text-tertiary">{t("admin.amountWillCredit")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={correcting}
                    onClick={() => void saveAmount()}
                  >
                    {correcting ? t("admin.saving") : t("admin.saveAmount")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={correcting}
                    onClick={() => {
                      setEditingAmount(false);
                      setAmountDraft(String(deposit.amount));
                      setAmountError("");
                    }}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-text-tertiary">{t("admin.amountWillCredit")}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAmountDraft(String(deposit.amount));
                    setAmountError("");
                    setEditingAmount(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t("admin.editAmount")}
                </Button>
              </div>
            )}
          </div>
        )}

        {meta.type === "gift_card" && (meta.frontImageUrl || meta.backImageUrl) && (
          <div className="mt-5 border-t border-border pt-5">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              {t("admin.uploadedImages")}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {meta.frontImageUrl && (
                <GiftCardImagePreview
                  storedPath={meta.frontImageUrl}
                  label={t("admin.frontImage")}
                  onZoom={setLightbox}
                  openLabel={t("admin.openFrontImage")}
                  loadingLabel={t("admin.imageLoading")}
                  failedLabel={t("admin.imageLoadFailed")}
                />
              )}
              {meta.backImageUrl && (
                <GiftCardImagePreview
                  storedPath={meta.backImageUrl}
                  label={t("admin.backImage")}
                  onZoom={setLightbox}
                  openLabel={t("admin.openBackImage")}
                  loadingLabel={t("admin.imageLoading")}
                  failedLabel={t("admin.imageLoadFailed")}
                />
              )}
            </div>
          </div>
        )}

        {meta.type === "plain" && meta.proofImageUrl && (
          <div className="mt-5 border-t border-border pt-5">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              {t("admin.proofOfPayment")}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <GiftCardImagePreview
                storedPath={meta.proofImageUrl}
                label={t("admin.proofOfPayment")}
                onZoom={setLightbox}
                openLabel={t("admin.openProofImage")}
                loadingLabel={t("admin.imageLoading")}
                failedLabel={t("admin.imageLoadFailed")}
              />
            </div>
          </div>
        )}

        {meta.type === "card" && meta.cardPhotoUrl && (
          <div className="mt-5 border-t border-border pt-5">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              {t("admin.cardPhoto")}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <GiftCardImagePreview
                storedPath={meta.cardPhotoUrl}
                label={t("admin.cardPhoto")}
                onZoom={setLightbox}
                openLabel={t("admin.openProofImage")}
                loadingLabel={t("admin.imageLoading")}
                failedLabel={t("admin.imageLoadFailed")}
              />
            </div>
          </div>
        )}

        {meta.type === "gift_card" && !meta.frontImageUrl && !meta.backImageUrl && (
          <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-6 text-center">
            <ImageIcon className="mx-auto h-6 w-6 text-text-tertiary" />
            <p className="mt-2 text-sm text-text-tertiary">{t("admin.noGiftCardImages")}</p>
          </div>
        )}

        {actions && <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">{actions}</div>}
      </div>

      {lightbox && (
        <button
          type="button"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
          aria-label={t("admin.closeDetails")}
        >
          <img
            src={lightbox}
            alt=""
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      )}
    </>
  );
}
