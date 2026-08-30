"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { getDepositConfig, type DepositConfig } from "@/lib/api/deposits";
import { getActivePartners } from "@/lib/deposit-options";
import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CreditCard, ExternalLink, HelpCircle, Sparkles } from "@/components/icons";
import type { PurchasePartner } from "@/lib/deposit-options";

function PartnerCard({ partner, accent }: { partner: PurchasePartner; accent: "brand" | "gold" }) {
  const { t } = useTranslation();
  const tag = partner.tag ?? (partner.tagKey ? t(partner.tagKey) : null);
  const description = partner.description ?? (partner.descriptionKey ? t(partner.descriptionKey) : "");

  return (
    <a
      href={partner.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex items-center gap-4 rounded-xl border border-border bg-bg-primary/60 p-4 transition-all hover:bg-bg-hover/40",
        accent === "brand" ? "hover:border-brand/30" : "hover:border-amber-500/30"
      )}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
        style={{ backgroundColor: partner.color }}
      >
        {partner.logoUrl ? (
          <img src={partner.logoUrl} alt="" className="h-6 w-6 object-contain" loading="lazy" />
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
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-text-tertiary group-hover:text-brand" />
    </a>
  );
}

function PartnerSection({
  icon: Icon,
  accent,
  badge,
  title,
  subtitle,
  stepHint,
  partners,
}: {
  icon: typeof CreditCard;
  accent: "brand" | "gold";
  badge: string;
  title: string;
  subtitle: string;
  stepHint: string;
  partners: PurchasePartner[];
}) {
  const badgeClass =
    accent === "brand"
      ? "border-brand/25 bg-brand/10 text-brand"
      : "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  const iconClass = accent === "brand" ? "bg-brand/10 text-brand" : "bg-amber-500/10 text-amber-600 dark:text-amber-400";

  if (partners.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-bg-secondary/40">
      <div className="border-b border-border px-5 py-5">
        <div className="flex gap-4">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", badgeClass)}>
              <Sparkles className="h-3 w-3" />
              {badge}
            </span>
            <h2 className="mt-2 text-lg font-semibold text-text-primary">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-text-tertiary">{subtitle}</p>
            <p className="mt-3 flex items-center gap-2 text-xs font-medium text-text-secondary">
              <HelpCircle className="h-3.5 w-3.5 shrink-0" />
              {stepHint}
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-3 p-5">
        {partners.map((partner) => (
          <PartnerCard key={partner.id} partner={partner} accent={accent} />
        ))}
      </div>
    </section>
  );
}

export function DepositFundsShowcase() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<DepositConfig | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void getDepositConfig(supabase).then(setConfig);
  }, []);

  const cryptoPartners = getActivePartners(config?.cryptoPartners);
  const giftPartners = getActivePartners(config?.giftCardPartners);

  if (cryptoPartners.length === 0 && giftPartners.length === 0) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
          {t("deposits.moreOptions")}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <PartnerSection
        icon={CreditCard}
        accent="brand"
        badge={t("deposits.buyCryptoBadge")}
        title={t("deposits.buyCryptoTitle")}
        subtitle={t("deposits.buyCryptoDesc")}
        stepHint={t("deposits.buyCryptoStep", { brandName: BRAND.name })}
        partners={cryptoPartners}
      />

      <PartnerSection
        icon={CreditCard}
        accent="gold"
        badge={t("deposits.giftCardsBadge")}
        title={t("deposits.giftCardsTitle")}
        subtitle={t("deposits.giftCardsDesc")}
        stepHint={t("deposits.giftCardsStep", { brandName: BRAND.name })}
        partners={giftPartners}
      />

      <p className="flex items-start gap-2 rounded-lg border border-border bg-bg-secondary/50 px-4 py-3 text-xs leading-relaxed text-text-tertiary">
        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
        {t("deposits.giftCardsFooter", { brandName: BRAND.name })}
      </p>
    </div>
  );
}
