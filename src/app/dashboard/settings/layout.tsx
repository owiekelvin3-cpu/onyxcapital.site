"use client";

import { SettingsProfileProvider } from "@/components/dashboard/settings/SettingsProfileProvider";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsProfileProvider>{children}</SettingsProfileProvider>;
}
