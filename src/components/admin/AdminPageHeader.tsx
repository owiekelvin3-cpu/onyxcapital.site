import type { ReactNode } from "react";
import { AdminNotificationBadge } from "@/components/admin/AdminNotificationBadge";

export function AdminPageHeader({
  title,
  subtitle,
  action,
  notificationCount,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  notificationCount?: number;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">Team</p>
          {notificationCount != null && notificationCount > 0 && (
            <AdminNotificationBadge count={notificationCount} />
          )}
        </div>
        <h1 className="mt-1 text-xl font-bold text-text-primary sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm leading-relaxed text-text-tertiary">{subtitle}</p>}
      </div>
      {action ? (
        <div className="w-full shrink-0 sm:w-auto [&_button]:w-full sm:[&_button]:w-auto">
          {action}
        </div>
      ) : null}
    </div>
  );
}
