"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  getPushPermissionStatus,
  isPushSupported,
  requestPushPermission,
  type PushPermissionStatus,
} from "@/lib/notifications/push";
import {
  isPushEnabled,
  isSoundEnabled,
  setPushEnabled,
  setSoundEnabled,
  subscribeToNotificationPrefs,
} from "@/lib/notifications/preferences";
import { playNotificationSound } from "@/lib/notifications/sound";
import { SettingsRow, SettingsSection } from "./shared";

function PrefToggle({
  enabled,
  onEnable,
  onDisable,
  enableLabel,
  disableLabel,
}: {
  enabled: boolean;
  onEnable: () => void;
  onDisable: () => void;
  enableLabel: string;
  disableLabel: string;
}) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-bg-tertiary p-1">
      <button
        type="button"
        onClick={onEnable}
        className={cn(
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          enabled ? "bg-bg-secondary text-text-primary shadow-sm" : "text-text-tertiary"
        )}
      >
        {enableLabel}
      </button>
      <button
        type="button"
        onClick={onDisable}
        className={cn(
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          !enabled ? "bg-bg-secondary text-text-primary shadow-sm" : "text-text-tertiary"
        )}
      >
        {disableLabel}
      </button>
    </div>
  );
}

function pushStatusLabel(status: PushPermissionStatus, t: (key: string) => string) {
  if (status === "granted") return t("settingsPage.pushStatusOn");
  if (status === "denied") return t("settingsPage.pushStatusBlocked");
  if (status === "unsupported") return t("settingsPage.pushStatusUnsupported");
  if (isPushEnabled()) return t("settingsPage.pushStatusOff");
  return t("settingsPage.pushStatusDefault");
}

export function SettingsNotificationsSection({ hideHeader = false }: { hideHeader?: boolean }) {
  const { t } = useTranslation();
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [pushEnabled, setPushEnabledState] = useState(false);
  const [pushPermission, setPushPermission] = useState<PushPermissionStatus>("default");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    setSoundEnabledState(isSoundEnabled());
    setPushEnabledState(isPushEnabled());
    setPushPermission(getPushPermissionStatus());
    return subscribeToNotificationPrefs(() => {
      setSoundEnabledState(isSoundEnabled());
      setPushEnabledState(isPushEnabled());
    });
  }, []);

  function handleSoundToggle(enabled: boolean) {
    setSoundEnabled(enabled);
    setSoundEnabledState(enabled);
    if (enabled) {
      void playNotificationSound({ force: true });
    }
  }

  async function handleEnablePush() {
    if (!isPushSupported()) return;
    setPushBusy(true);
    try {
      const permission = await requestPushPermission();
      setPushPermission(permission);
      if (permission === "granted") {
        setPushEnabled(true);
        setPushEnabledState(true);
      }
    } finally {
      setPushBusy(false);
    }
  }

  function handleDisablePush() {
    setPushEnabled(false);
    setPushEnabledState(false);
  }

  const pushActive = pushEnabled && pushPermission === "granted";

  return (
    <SettingsSection
      title={t("settingsPage.notificationsTitle")}
      description={t("settingsPage.notificationsDesc")}
      hideHeader={hideHeader}
    >
      <SettingsRow
        title={t("settingsPage.pushNotifications")}
        description={t("settingsPage.pushNotificationsDesc")}
      >
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
              pushActive && "bg-green/10 text-green",
              pushPermission === "denied" && "bg-red/10 text-red",
              !pushActive && pushPermission !== "denied" && "bg-bg-hover text-text-tertiary"
            )}
          >
            {pushStatusLabel(pushPermission, t)}
          </span>
          {!isPushSupported() ? (
            <p className="max-w-xs text-xs text-text-tertiary text-right">
              {t("settingsPage.pushUnsupported")}
            </p>
          ) : pushPermission === "denied" ? (
            <p className="max-w-xs text-xs text-text-tertiary text-right">
              {t("settingsPage.pushBlockedHelp")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {!pushActive ? (
                <Button size="sm" disabled={pushBusy} onClick={() => void handleEnablePush()}>
                  {t("settingsPage.enablePush")}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={handleDisablePush}>
                  {t("settingsPage.disablePush")}
                </Button>
              )}
            </div>
          )}
        </div>
      </SettingsRow>

      <SettingsRow
        title={t("settingsPage.notificationSound")}
        description={t("settingsPage.notificationSoundDesc")}
      >
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <PrefToggle
            enabled={soundEnabled}
            onEnable={() => handleSoundToggle(true)}
            onDisable={() => handleSoundToggle(false)}
            enableLabel={t("settingsPage.prefOn")}
            disableLabel={t("settingsPage.prefOff")}
          />
          <Button size="sm" variant="ghost" onClick={() => void playNotificationSound({ force: true })}>
            {t("settingsPage.testSound")}
          </Button>
        </div>
      </SettingsRow>

      <div className="mt-4 rounded-2xl border border-border bg-bg-primary/50 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary">{t("notifications.title")}</p>
          <p className="text-xs text-text-tertiary mt-0.5">{t("settingsPage.notifInboxHint")}</p>
        </div>
        <Link href="/dashboard/notifications">
          <Button variant="outline" size="sm">
            {t("settingsPage.openNotifications")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </SettingsSection>
  );
}
