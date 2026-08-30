"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Bell, Comments, LogOut, Receipt, User } from "@/components/icons";
import { AccountLinkCard, SettingsSection } from "./shared";

export function SettingsAccountSection({
  showSignOut = true,
  hideHeader = false,
}: {
  showSignOut?: boolean;
  hideHeader?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <SettingsSection
        title={t("dashboard.navGroupAccount")}
        description={t("dashboard.openTransactions")}
        hideHeader={hideHeader}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <AccountLinkCard
            href="/dashboard/transactions"
            title={t("dashboard.transactions")}
            description={t("transactions.subtitle")}
            icon={<Receipt className="h-4 w-4" />}
          />
          <AccountLinkCard
            href="/dashboard/notifications"
            title={t("dashboard.notifications")}
            description={t("notifications.pageSubtitle")}
            icon={<Bell className="h-4 w-4" />}
          />
          <AccountLinkCard
            href="/dashboard/support"
            title={t("dashboard.support")}
            description={t("settingsPage.notifInboxHint")}
            icon={<Comments className="h-4 w-4" />}
          />
          <AccountLinkCard
            href="/help"
            title="Help Center"
            description={t("common.learnMore")}
            icon={<User className="h-4 w-4" />}
          />
        </div>
      </SettingsSection>

      {showSignOut && (
        <div className="flex justify-end pt-2">
          <Button
            variant="ghost"
            onClick={() => void handleSignOut()}
            className="text-red hover:bg-red/5 hover:text-red"
          >
            <LogOut className="h-4 w-4" />
            {t("common.signOut")}
          </Button>
        </div>
      )}
    </>
  );
}
