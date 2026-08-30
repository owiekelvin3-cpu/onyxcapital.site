"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "@/components/icons";
import { cn } from "@/lib/utils";
import i18n, { ensureLocaleLoaded, type SupportedLanguage } from "@/i18n";

export const LANGUAGES = [
  { code: "en" as const, native: "English" },
  { code: "es" as const, native: "Español" },
  { code: "fr" as const, native: "Français" },
  { code: "de" as const, native: "Deutsch" },
  { code: "ar" as const, native: "العربية" },
  { code: "zh" as const, native: "中文" },
];

export function LanguageSelector({
  className,
  showLabel = false,
  menuPlacement = "bottom",
}: {
  className?: string;
  showLabel?: boolean;
  menuPlacement?: "bottom" | "top";
}) {
  const { t, i18n: i18nInstance } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const locale = (i18nInstance.language?.split("-")[0] || "en") as SupportedLanguage;
  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function selectLocale(code: SupportedLanguage) {
    await ensureLocaleLoaded(code);
    await i18n.changeLanguage(code);
    setOpen(false);
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-2 text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
        aria-label={`${t("common.language")}: ${current.native}`}
        aria-expanded={open}
      >
        <Globe className="w-4 h-4" aria-hidden />
        {showLabel && (
          <span className="text-xs font-semibold uppercase">{current.code}</span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-[70] w-44 rounded-xl border border-border bg-bg-secondary py-1 shadow-xl",
            menuPlacement === "top"
              ? "bottom-full left-0 mb-1.5"
              : "right-0 top-full mt-1.5"
          )}
        >
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            {t("common.language")}
          </p>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => void selectLocale(lang.code)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            >
              <span>{lang.native}</span>
              {locale === lang.code && <Check className="w-4 h-4 text-brand" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
