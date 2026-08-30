"use client";

import { useTranslation } from "react-i18next";
import { Moon, Sun } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useTheme, type ColorTheme } from "@/components/theme/ThemeProvider";

export function ThemeToggle({
  className,
  showLabel = false,
  variant = "icon",
}: {
  className?: string;
  showLabel?: boolean;
  variant?: "icon" | "segmented";
}) {
  const { t } = useTranslation();
  const { theme, setTheme, toggleTheme, mounted } = useTheme();

  if (variant === "segmented") {
    return (
      <div className={cn("inline-flex rounded-xl border border-border bg-bg-tertiary p-1", className)}>
        {(["light", "dark"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTheme(option)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              theme === option
                ? "bg-bg-secondary text-text-primary shadow-sm"
                : "text-text-tertiary hover:text-text-secondary"
            )}
            aria-pressed={theme === option}
          >
            {option === "light" ? (
              <Sun className="h-4 w-4" aria-hidden />
            ) : (
              <Moon className="h-4 w-4" aria-hidden />
            )}
            {option === "light" ? t("theme.light") : t("theme.dark")}
          </button>
        ))}
      </div>
    );
  }

  const nextTheme: ColorTheme = theme === "light" ? "dark" : "light";
  const label =
    theme === "light" ? t("theme.switchToDark") : t("theme.switchToLight");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl p-2.5 text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary",
        className
      )}
      aria-label={label}
      title={label}
    >
      {mounted && theme === "dark" ? (
        <Sun className="h-[18px] w-[18px]" aria-hidden />
      ) : (
        <Moon className="h-[18px] w-[18px]" aria-hidden />
      )}
      {showLabel && (
        <span className="text-xs font-medium">
          {theme === "light" ? t("theme.light") : t("theme.dark")}
        </span>
      )}
    </button>
  );
}
