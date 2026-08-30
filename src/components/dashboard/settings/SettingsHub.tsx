"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Bell, Globe, LogOut, Settings as SettingsIcon, User } from "@/components/icons";
import { SettingsNavCard } from "./shared";

export function SettingsHub() {
  const { t } = useTranslation();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const sections = [
    {
      href: "/dashboard/settings/profile",
      title: t("settingsPage.sections.profile"),
      description: t("settingsPage.profileDesc"),
      icon: <User className="h-4 w-4" />,
    },
    {
      href: "/dashboard/settings/preferences",
      title: t("settingsPage.sections.preferences"),
      description: t("settingsPage.preferencesDesc"),
      icon: <Globe className="h-4 w-4" />,
    },
    {
      href: "/dashboard/settings/notifications",
      title: t("settingsPage.sections.notifications"),
      description: t("settingsPage.notificationsDesc"),
      icon: <Bell className="h-4 w-4" />,
    },
    {
      href: "/dashboard/settings/account",
      title: t("settingsPage.sections.account", { defaultValue: "Account" }),
      description: t("dashboard.openTransactions"),
      icon: <SettingsIcon className="h-4 w-4" />,
    },
  ] as const;

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <SettingsNavCard key={section.href} {...section} />
      ))}

      <div className="flex justify-end pt-3">
        <Button
          variant="ghost"
          onClick={() => void handleSignOut()}
          className="text-red hover:bg-red/5 hover:text-red"
        >
          <LogOut className="h-4 w-4" />
          {t("common.signOut")}
        </Button>
      </div>
    </div>
  );
}
