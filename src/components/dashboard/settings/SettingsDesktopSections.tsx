"use client";

import { SettingsAccountSection } from "./SettingsAccountSection";
import { SettingsNotificationsSection } from "./SettingsNotificationsSection";
import { SettingsPreferencesSection } from "./SettingsPreferencesSection";
import { SettingsProfileSection } from "./SettingsProfileSection";

export function SettingsDesktopSections() {
  return (
    <div className="space-y-5">
      <SettingsProfileSection />
      <SettingsPreferencesSection />
      <SettingsNotificationsSection />
      <SettingsAccountSection />
    </div>
  );
}
