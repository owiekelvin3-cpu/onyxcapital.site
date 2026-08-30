"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, ExternalLink, X, ZoomIn, ImageIcon } from "@/components/icons";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatDepositMethod } from "@/lib/deposit-options";
import {
  getGiftCardBrandFromMethod,
  parseDepositNotes,
} from "@/lib/deposit-details";
import { createKycDocumentSignedUrl } from "@/lib/kyc";
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
}: {
  deposit: DepositRow;
  onClose: () => void;
  actions?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const meta = parseDepositNotes(deposit.notes, deposit.method);
  const methodLabel = formatDepositMethod(deposit.method);
  const giftBrand = getGiftCardBrandFromMethod(deposit.method);

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
          <DetailRow label={t("admin.amount")} value={formatCurrency(deposit.amount)} />
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
          {meta.type === "plain" && meta.text && (
            <DetailRow label={t("admin.notes")} value={meta.text} mono />
          )}
        </dl>

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
