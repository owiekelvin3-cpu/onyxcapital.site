"use client";

import { useTranslation } from "react-i18next";
import { SettingsShell } from "@/components/dashboard/settings/SettingsShell";
import { SettingsPreferencesSection } from "@/components/dashboard/settings/SettingsPreferencesSection";

export default function SettingsPreferencesPage() {
  const { t } = useTranslation();

  return (
    <SettingsShell
      title={t("settingsPage.preferencesTitle")}
      subtitle={t("settingsPage.preferencesDesc")}
    >
      <SettingsPreferencesSection hideHeader />
    </SettingsShell>
  );
}
