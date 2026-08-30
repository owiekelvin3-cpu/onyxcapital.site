"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { GIFT_CARD_BRANDS } from "@/lib/deposit-options";
import { Card } from "@/components/ui/Card";
import { GiftCardBrandTile } from "@/components/dashboard/deposit/DepositMethodIcons";
import { ArrowLeft } from "@/components/icons";
import { cn } from "@/lib/utils";

export default function GiftCardDepositPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link
          href="/dashboard/deposit"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" />
          All deposit methods
        </Link>
        <h1 className="text-lg font-bold text-text-primary">{t("deposits.giftCardTitle")}</h1>
        <p className="mt-1 text-[13px] text-text-tertiary">{t("deposits.giftCardPageDesc")}</p>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {GIFT_CARD_BRANDS.map((brand) => (
            <Link
              key={brand.id}
              href={`/dashboard/deposit/gift-card/${brand.id}`}
              className={cn(
                "group flex flex-col items-center gap-3 rounded-2xl border border-border bg-bg-primary p-4 text-center transition-all",
                "hover:border-brand/30 hover:bg-bg-hover/40 hover:shadow-sm"
              )}
            >
              <GiftCardBrandTile brand={brand} size="lg" />
              <div className="min-w-0">
                <span className="block text-sm font-semibold text-text-primary">{brand.label}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-text-tertiary line-clamp-2">
                  {brand.fullName}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
