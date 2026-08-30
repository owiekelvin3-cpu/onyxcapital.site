"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Comments } from "@/components/icons";

export function AccountSuspendedBanner({ reason }: { reason?: string | null }) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 flex gap-3 rounded-2xl border border-red/30 bg-red/5 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red/10 text-red">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary">{t("dashboard.suspended.title")}</p>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          {t("dashboard.suspended.description")}
        </p>
        {reason?.trim() && (
          <p className="mt-2 text-xs text-text-tertiary">
            <span className="font-medium text-text-secondary">{t("dashboard.suspended.reason")}:</span>{" "}
            {reason.trim()}
          </p>
        )}
        <Link
          href="/dashboard/support"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-hover"
        >
          <Comments className="h-3.5 w-3.5" />
          {t("dashboard.suspended.contactAdmin")}
        </Link>
      </div>
    </div>
  );
}

export function SuspendedAvatarBadge({ className }: { className?: string }) {
  return (
    <span
      className={className}
      title="Account suspended"
      aria-label="Account suspended"
    >
      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-bg-primary bg-red text-[9px] font-bold text-white">
        !
      </span>
    </span>
  );
}
