"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminFilterBar<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { key: T; label: string; count?: number }[];
  className?: string;
}) {
  return (
    <div className={cn("scroll-x -mx-0.5 px-0.5", className)}>
      <div className="inline-flex gap-1 rounded-xl border border-border bg-bg-secondary/50 p-1">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cn(
              "min-h-10 shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors",
              value === option.key
                ? "bg-brand/10 text-brand shadow-sm"
                : "text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
            )}
          >
            {option.label}
            {option.count != null ? ` (${option.count})` : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Full-width action buttons on mobile, inline on sm+. */
export function AdminListActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:grid-cols-none",
        className
      )}
    >
      {children}
    </div>
  );
}
