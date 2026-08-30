"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import {
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import type { NotificationRow } from "@/lib/supabase/types";
import { Button } from "@/components/ui/Button";
import { Bell, Check, Loader2 } from "@/components/icons";
import { playNotificationSound } from "@/lib/notifications/sound";
import { cn, formatDate } from "@/lib/utils";

type Filter = "all" | "unread";

export function NotificationsClient({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      setItems(await getUserNotifications(supabase, userId));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
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
          void playNotificationSound({ dedupeKey: row.id });
          void load();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => void load()
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => void load()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, userId]);

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  const visible = useMemo(() => {
    if (filter === "unread") return items.filter((item) => !item.read);
    return items;
  }, [filter, items]);

  async function handleMarkRead(notification: NotificationRow) {
    if (notification.read) return;
    const supabase = createClient();
    await markNotificationRead(supabase, notification.id);
    setItems((prev) =>
      prev.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
    );
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      const supabase = createClient();
      await markAllNotificationsRead(supabase, userId);
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
            {t("dashboard.notifications")}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-1">
            {t("notifications.title")}
          </h1>
          <p className="text-sm text-text-tertiary mt-1.5">{t("notifications.pageSubtitle")}</p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleMarkAllRead()}
            disabled={markingAll}
          >
            {markingAll ? <Loader2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {t("notifications.markAllRead")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition-colors",
            filter === "all"
              ? "bg-nav-active text-nav-active-text"
              : "bg-nav-pill text-text-secondary hover:bg-bg-hover"
          )}
        >
          {t("notifications.filterAll")}
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition-colors",
            filter === "unread"
              ? "bg-nav-active text-nav-active-text"
              : "bg-nav-pill text-text-secondary hover:bg-bg-hover"
          )}
        >
          {t("notifications.filterUnread", { count: unreadCount })}
        </button>
        {unreadCount > 0 && (
          <span className="text-xs text-text-tertiary">
            {t("notifications.unreadCount", { count: unreadCount })}
          </span>
        )}
      </div>

      <div className="coinix-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-text-tertiary">
            <Loader2 className="h-4 w-4" />
            {t("notifications.loading")}
          </div>
        ) : visible.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-bg-primary text-text-tertiary">
              <Bell className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-medium text-text-primary">
              {filter === "unread" ? t("notifications.emptyUnread") : t("notifications.empty")}
            </p>
            <Link
              href="/dashboard/transactions"
              className="mt-3 inline-block text-sm font-medium text-brand hover:text-brand-hover"
            >
              {t("dashboard.openTransactions")}
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void handleMarkRead(item)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-bg-hover/60",
                    !item.read && "bg-brand/[0.03]"
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      item.read ? "bg-transparent" : "bg-brand"
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                      {!item.read && (
                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                          {t("common.live")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-text-secondary leading-relaxed">{item.message}</p>
                    <p className="mt-2 text-[11px] text-text-tertiary">{formatDate(item.created_at)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
