import { isPushEnabled } from "./preferences";

export type PushPermissionStatus = "granted" | "denied" | "default" | "unsupported";

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPushPermissionStatus(): PushPermissionStatus {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission as PushPermissionStatus;
}

export async function requestPushPermission(): Promise<PushPermissionStatus> {
  if (!isPushSupported()) return "unsupported";
  const result = await Notification.requestPermission();
  return result as PushPermissionStatus;
}

export function showBrowserNotification(
  title: string,
  body: string,
  options?: { onClick?: () => void; tag?: string }
) {
  if (!isPushEnabled() || !isPushSupported() || Notification.permission !== "granted") {
    return;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: "/icon",
      tag: options?.tag,
    });

    notification.onclick = () => {
      window.focus();
      options?.onClick?.();
      notification.close();
    };
  } catch {
    /* ignore */
  }
}
