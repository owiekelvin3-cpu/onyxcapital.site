import {
  getPushPermissionStatus,
  isPushSupported,
  requestPushPermission,
} from "./push";
import { setPushEnabled, setSoundEnabled } from "./preferences";

let setupDone = false;
let unlockBound = false;

export function enableAdminNotificationDefaults() {
  setSoundEnabled(true);
  setPushEnabled(true);
}

async function requestAdminPushPermission() {
  if (!isPushSupported()) return;
  if (getPushPermissionStatus() !== "default") return;
  await requestPushPermission();
}

export async function ensureAdminNotificationsEnabled() {
  enableAdminNotificationDefaults();
  if (setupDone) return;
  setupDone = true;
  await requestAdminPushPermission();
}

export function bindAdminNotificationUnlock() {
  if (typeof window === "undefined" || unlockBound) return;
  unlockBound = true;

  const unlock = () => {
    void ensureAdminNotificationsEnabled();
  };

  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true });
}
