"use client";

import { useTranslation } from "react-i18next";
import { SettingsShell } from "@/components/dashboard/settings/SettingsShell";
import { SettingsProfileSection } from "@/components/dashboard/settings/SettingsProfileSection";

export default function SettingsProfilePage() {
  const { t } = useTranslation();

  return (
    <SettingsShell title={t("settingsPage.profileTitle")} subtitle={t("settingsPage.profileDesc")}>
      <SettingsProfileSection hideHeader />
    </SettingsShell>
  );
}
