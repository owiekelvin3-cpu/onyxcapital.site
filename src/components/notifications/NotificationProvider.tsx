"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { getUserNotifications } from "@/lib/api/notifications";
import type { NotificationRow } from "@/lib/supabase/types";
import { alertNewNotification } from "@/lib/notifications/alert";
import { setupNotificationAudioUnlock } from "@/lib/notifications/sound";
import { Bell, X } from "@/components/icons";
import { cn } from "@/lib/utils";

type ToastState = {
  id: string;
  title: string;
  message: string;
};

export function NotificationProvider({
  userId,
  children,
}: {
  userId?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const seenIds = useRef(new Set<string>());
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    setupNotificationAudioUnlock();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    let cancelled = false;

    void getUserNotifications(supabase, userId).then((items) => {
      if (cancelled) return;
      items.forEach((item) => seenIds.current.add(item.id));
    });

    const channel = supabase
      .channel(`notification-alerts-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          if (seenIds.current.has(row.id)) return;
          seenIds.current.add(row.id);

          alertNewNotification(row, {
            onClick: () => router.push("/dashboard/notifications"),
          });
          setToast({ id: row.id, title: row.title, message: row.message });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <>
      {children}
      {toast && (
        <div
          className={cn(
            "pointer-events-none fixed inset-x-0 top-[calc(4.25rem+var(--safe-top))] z-[70] flex justify-center px-3",
            "animate-in fade-in slide-in-from-top-2 duration-300"
          )}
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-brand/20 bg-bg-secondary/95 p-4 shadow-lg backdrop-blur-xl">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Bell className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">{toast.title}</p>
              <p className="mt-0.5 text-xs text-text-secondary leading-relaxed line-clamp-2">
                {toast.message}
              </p>
              <Link
                href="/dashboard/notifications"
                className="mt-2 inline-block text-xs font-semibold text-brand hover:text-brand-hover"
                onClick={() => setToast(null)}
              >
                {t("notifications.viewAll")}
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="shrink-0 rounded-lg p-1.5 text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
              aria-label={t("notifications.dismissToast")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
