"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, HelpCircle, TrendingUp, X } from "@/components/icons";
import { BRAND } from "@/lib/constants";
import { getActivePartners, type PurchasePartner } from "@/lib/deposit-options";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { cn } from "@/lib/utils";

function PartnerLink({ partner }: { partner: PurchasePartner }) {
  const { t } = useTranslation();
  const tag = partner.tag ?? (partner.tagKey ? t(partner.tagKey) : null);
  const description =
    partner.description ?? (partner.descriptionKey ? t(partner.descriptionKey) : "");

  return (
    <a
      href={partner.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-2xl border border-border bg-bg-primary/70 p-4 transition-all hover:border-[var(--brand-accent)]/35 hover:bg-bg-hover/50 touch-target"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
        style={{ backgroundColor: partner.color }}
      >
        {partner.logoUrl ? (
          <img src={partner.logoUrl} alt="" className="h-7 w-7 object-contain" loading="lazy" />
        ) : (
          partner.name.slice(0, 2).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-text-primary">{partner.name}</p>
          {tag && (
            <span className="rounded-full border border-border bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-tertiary">
              {tag}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-text-tertiary">{description}</p>
        <p className="mt-1 text-[11px] font-medium text-[var(--brand-accent)]">
          Open {partner.name} app
        </p>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-text-tertiary group-hover:text-[var(--brand-accent)]" />
    </a>
  );
}

export function SpotBuyCryptoSheet({
  open,
  partners,
  onClose,
}: {
  open: boolean;
  partners: PurchasePartner[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const activePartners = getActivePartners(partners);

  useBodyScrollLock(open && mounted);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
      return;
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 320);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close buy crypto options"
        className={cn(
          "fixed inset-0 z-[90] bg-black/65 backdrop-blur-[2px] transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buy crypto"
        className={cn(
          "fixed inset-x-0 bottom-0 z-[91] mx-auto flex w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-border bg-bg-secondary shadow-2xl",
          "max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-bottom)-0.5rem))] pb-[max(0.25rem,var(--safe-bottom))]",
          visible ? "spot-deposit-sheet-enter" : "translate-y-full opacity-0"
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 safe-area-x">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-accent)]/15 text-[var(--brand-accent)]">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">
                {t("deposits.buyCryptoTitle")}
              </p>
              <p className="text-xs text-text-tertiary">Partner apps · opens in new tab</p>
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 safe-area-x sm:py-5">
          <p className="text-sm leading-relaxed text-text-tertiary">
            {t("deposits.buyCryptoDesc")}
          </p>
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-bg-primary/60 px-3 py-2.5 text-xs leading-relaxed text-text-secondary">
            <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand-accent)]" />
            {t("deposits.buyCryptoStep", { brandName: BRAND.name })}
          </p>

          <div className="mt-4 space-y-3">
            {activePartners.length > 0 ? (
              activePartners.map((partner) => <PartnerLink key={partner.id} partner={partner} />)
            ) : (
              <p className="rounded-2xl border border-border bg-bg-primary/60 p-4 text-sm text-text-tertiary">
                Buy-crypto partners are not configured yet. Contact support or use Receive to deposit
                crypto you already own.
              </p>
            )}
          </div>

          <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-text-tertiary">
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t("deposits.buyCryptoFooter", { brandName: BRAND.name })}
          </p>
        </div>
      </div>
    </>,
    document.body
  );
}
