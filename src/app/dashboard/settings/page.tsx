"use client";

import { useTranslation } from "react-i18next";
import { SettingsShell } from "@/components/dashboard/settings/SettingsShell";
import { SettingsHub } from "@/components/dashboard/settings/SettingsHub";
import { SettingsDesktopSections } from "@/components/dashboard/settings/SettingsDesktopSections";

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <>
      <div className="lg:hidden">
        <SettingsShell
          title={t("settingsPage.title")}
          subtitle={t("settingsPage.subtitle")}
          showBack={false}
        >
          <SettingsHub />
        </SettingsShell>
      </div>

      <div className="hidden lg:block">
        <SettingsShell
          title={t("settingsPage.title")}
          subtitle={t("settingsPage.subtitle")}
          showBack={false}
        >
          <SettingsDesktopSections />
        </SettingsShell>
      </div>
    </>
  );
}
