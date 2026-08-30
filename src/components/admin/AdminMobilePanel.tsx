"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "@/components/icons";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

export function AdminMobilePanel({
  open,
  title,
  subtitle,
  onClose,
  children,
  hideFrom = "lg",
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  hideFrom?: "lg" | "xl";
}) {
  const { t } = useTranslation();
  const media = hideFrom === "xl" ? "(max-width: 1279px)" : "(max-width: 1023px)";
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(media);
    const sync = () => setIsMobileView(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [media]);

  useBodyScrollLock(open && isMobileView);

  if (!open || !isMobileView || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-bg-primary"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="flex shrink-0 items-center gap-1 border-b border-border bg-bg-secondary/95 px-1 py-2 backdrop-blur-xl safe-area-top safe-area-x">
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-brand hover:bg-bg-hover"
          aria-label={t("common.back")}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1 pr-3">
          <p className="truncate text-[15px] font-semibold text-text-primary">{title}</p>
          {subtitle && <p className="truncate text-xs text-text-tertiary">{subtitle}</p>}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 safe-area-x safe-area-bottom">
        {children}
      </div>
    </div>,
    document.body
  );
}
