"use client";

import { useTranslation } from "react-i18next";
import { Shield } from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { DepositMethodCard } from "@/components/dashboard/deposit/DepositMethodCard";
import {
  CryptoDepositPreview,
  GiftCardDepositPreview,
} from "@/components/dashboard/deposit/DepositMethodIcons";
import { DepositFundsShowcase } from "@/components/dashboard/deposit/DepositFundsShowcase";

export default function DepositHubPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-bold text-text-primary">{t("deposits.title")}</h1>
        <p className="mt-1 text-[13px] text-text-tertiary">{t("deposits.subtitle")}</p>
      </div>

      <Card className="space-y-4">
        <DepositMethodCard
          href="/dashboard/deposit/crypto"
          title={t("deposits.cryptoTitle")}
          description={t("deposits.cryptoDesc")}
          iconGrid={<CryptoDepositPreview size="lg" />}
        />

        <DepositMethodCard
          href="/dashboard/deposit/gift-card"
          title={t("deposits.giftCardTitle")}
          description={t("deposits.giftCardDesc")}
          iconGrid={<GiftCardDepositPreview size="lg" />}
        />

        <div className="flex gap-3 rounded-2xl border border-border bg-bg-secondary/40 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Shield className="h-4 w-4" />
          </span>
          <p className="text-sm leading-relaxed text-text-secondary">{t("deposits.verificationNote")}</p>
        </div>
      </Card>

      <DepositFundsShowcase />
    </div>
  );
}
