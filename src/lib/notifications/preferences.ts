export const SOUND_PREF_KEY = "onyx-notification-sound";
export const PUSH_PREF_KEY = "onyx-notification-push";

const PREFS_CHANGED = "onyx-notification-prefs-changed";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(SOUND_PREF_KEY);
  return stored === null ? true : stored === "true";
}

export function isPushEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PUSH_PREF_KEY) === "true";
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem(SOUND_PREF_KEY, String(enabled));
  window.dispatchEvent(new CustomEvent(PREFS_CHANGED));
}

export function setPushEnabled(enabled: boolean) {
  localStorage.setItem(PUSH_PREF_KEY, String(enabled));
  window.dispatchEvent(new CustomEvent(PREFS_CHANGED));
}

export function subscribeToNotificationPrefs(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PREFS_CHANGED, callback);
  return () => window.removeEventListener(PREFS_CHANGED, callback);
}
