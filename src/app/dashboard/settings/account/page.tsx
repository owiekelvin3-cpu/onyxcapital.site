"use client";

import { useTranslation } from "react-i18next";
import { SettingsShell } from "@/components/dashboard/settings/SettingsShell";
import { SettingsAccountSection } from "@/components/dashboard/settings/SettingsAccountSection";

export default function SettingsAccountPage() {
  const { t } = useTranslation();

  return (
    <SettingsShell title={t("dashboard.navGroupAccount")} subtitle={t("dashboard.openTransactions")}>
      <SettingsAccountSection hideHeader />
    </SettingsShell>
  );
}
