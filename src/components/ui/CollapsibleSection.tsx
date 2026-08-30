"use client";

import { useState } from "react";
import { ChevronDown } from "@/components/icons";
import { cn } from "@/lib/utils";

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("rf-card overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left lg:hidden"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          {subtitle && <p className="mt-0.5 text-xs text-text-tertiary">{subtitle}</p>}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-tertiary transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      <div className="hidden lg:block border-b border-border px-4 py-3.5">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs text-text-tertiary">{subtitle}</p>}
      </div>

      <div className={cn("px-4 pb-4", !open && "hidden lg:block")}>{children}</div>
    </div>
  );
}
