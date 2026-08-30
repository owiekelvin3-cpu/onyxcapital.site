import { playNotificationSound } from "./sound";
import { isPushSupported } from "./push";

export type AdminAlertEvent = {
  title: string;
  body: string;
  href: string;
  dedupeKey: string;
  onNavigate?: () => void;
};

function showAdminBrowserNotification(
  title: string,
  body: string,
  options?: { onClick?: () => void; tag?: string }
) {
  if (!isPushSupported() || Notification.permission !== "granted") return;

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

export function alertAdminEvent(event: AdminAlertEvent) {
  void playNotificationSound({ dedupeKey: event.dedupeKey, force: true });

  showAdminBrowserNotification(event.title, event.body, {
    tag: event.dedupeKey,
    onClick: event.onNavigate,
  });
}
