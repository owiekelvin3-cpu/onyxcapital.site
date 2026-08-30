"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePathname } from "next/navigation";
import { Bell } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { getUnreadNotificationCount } from "@/lib/api/notifications";
import { cn } from "@/lib/utils";

export function NotificationBell({ className }: { className?: string }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      try {
        setCount(await getUnreadNotificationCount(supabase, user.id));
      } catch {
        /* ignore badge errors */
      }
    }

    void load();

    const channel = supabase
      .channel("notification-bell")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => void load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [pathname]);

  const active = pathname.startsWith("/dashboard/notifications");

  return (
    <Link
      href="/dashboard/notifications"
      className={cn(
        "relative hidden rounded-xl p-2.5 transition-colors sm:inline-flex",
        active
          ? "bg-brand/10 text-brand"
          : "text-text-tertiary hover:bg-bg-hover hover:text-text-primary",
        className
      )}
      aria-label={t("notifications.bellLabel")}
    >
      <Bell className="h-[18px] w-[18px]" />
      {count > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-text">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
