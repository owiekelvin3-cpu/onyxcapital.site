"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "@/components/icons";

export function SettingsShell({
  title,
  subtitle,
  showBack = true,
  children,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {showBack && (
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 rounded-xl px-1 py-1 text-sm font-medium text-text-tertiary transition-colors hover:text-text-primary lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Link>
      )}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
          {t("dashboard.settings")}
        </p>
        <h1 className="mt-1 text-xl sm:text-2xl font-bold text-text-primary">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-text-tertiary">{subtitle}</p>}
      </div>

      {children}
    </div>
  );
}
