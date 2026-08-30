"use client";

import Link from "next/link";
import { ChevronRight } from "@/components/icons";
import { cn } from "@/lib/utils";

export function DepositMethodCard({
  href,
  title,
  description,
  iconGrid,
}: {
  href: string;
  title: string;
  description: string;
  iconGrid: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-4 rounded-2xl border border-border bg-bg-secondary/50 p-5 transition-all",
        "hover:border-brand/30 hover:bg-bg-hover/40"
      )}
    >
      {iconGrid}
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-text-tertiary">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
    </Link>
  );
}
