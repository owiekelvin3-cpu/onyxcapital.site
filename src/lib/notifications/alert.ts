import type { NotificationRow } from "@/lib/supabase/types";
import { showBrowserNotification } from "./push";
import { playNotificationSound } from "./sound";

export type NotificationAlertOptions = {
  onClick?: () => void;
  skipSound?: boolean;
  skipPush?: boolean;
};

export function alertNewNotification(row: NotificationRow, options?: NotificationAlertOptions) {
  if (!options?.skipSound) {
    void playNotificationSound({ dedupeKey: row.id });
  }

  if (!options?.skipPush) {
    showBrowserNotification(row.title, row.message, {
      tag: row.id,
      onClick: options?.onClick,
    });
  }
}
