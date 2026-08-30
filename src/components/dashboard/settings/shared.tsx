"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { ChevronRight } from "@/components/icons";

export function SettingsSection({
  title,
  description,
  hideHeader = false,
  children,
}: {
  title: string;
  description?: string;
  hideHeader?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      {!hideHeader && (
        <div className="mb-5">
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-text-tertiary leading-relaxed">{description}</p>
          )}
        </div>
      )}
      {children}
    </Card>
  );
}

export function SettingsRow({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-text-tertiary leading-relaxed">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function KycBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        status === "approved" && "bg-green/10 text-green",
        status === "pending" && "bg-amber-500/10 text-amber-600 dark:text-amber-300",
        status === "rejected" && "bg-red/10 text-red",
        status === "none" && "bg-bg-hover text-text-tertiary"
      )}
    >
      {label}
    </span>
  );
}

export function AccountLinkCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-bg-primary/40 px-4 py-3.5 transition-all hover:border-brand/20 hover:bg-bg-hover/50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-secondary text-brand">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary group-hover:text-brand transition-colors">
          {title}
        </p>
        <p className="text-xs text-text-tertiary mt-0.5">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary opacity-50 group-hover:opacity-100" />
    </Link>
  );
}

export function SettingsNavCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-bg-secondary/60 px-4 py-4 transition-all hover:border-brand/20 hover:bg-bg-hover/40"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-bg-primary text-brand">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary group-hover:text-brand transition-colors">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-text-tertiary leading-relaxed">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary opacity-50 group-hover:opacity-100" />
    </Link>
  );
}
