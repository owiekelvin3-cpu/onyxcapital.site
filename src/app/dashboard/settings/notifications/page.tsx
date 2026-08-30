"use client";

import { useTranslation } from "react-i18next";
import { SettingsShell } from "@/components/dashboard/settings/SettingsShell";
import { SettingsNotificationsSection } from "@/components/dashboard/settings/SettingsNotificationsSection";

export default function SettingsNotificationsPage() {
  const { t } = useTranslation();

  return (
    <SettingsShell
      title={t("settingsPage.notificationsTitle")}
      subtitle={t("settingsPage.notificationsDesc")}
    >
      <SettingsNotificationsSection hideHeader />
    </SettingsShell>
  );
}
