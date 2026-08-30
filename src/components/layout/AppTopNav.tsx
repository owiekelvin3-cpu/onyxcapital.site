"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { OnyxLogo } from "@/components/brand/OnyxLogo";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { Menu, Receipt, X } from "@/components/icons";
import { useState } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

export type NavLink = {
  labelKey: string;
  href: string;
  exact?: boolean;
};

const DASHBOARD_LINKS: NavLink[] = [
  { labelKey: "dashboard.navDashboard", href: "/dashboard", exact: true },
  { labelKey: "nav.markets", href: "/dashboard/portfolio" },
  { labelKey: "dashboard.aiTrading", href: "/dashboard/ai-trading" },
  { labelKey: "dashboard.copyTrading", href: "/dashboard/copy-trading" },
  { labelKey: "dashboard.settings", href: "/dashboard/settings" },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppTopNav({
  mode = "dashboard",
  userName,
  userEmail,
  avatarUrl,
  authActions,
}: {
  mode?: "marketing" | "dashboard";
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  authActions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  useBodyScrollLock(menuOpen);

  const initial = (userName || userEmail || "U").charAt(0).toUpperCase();
  const links = mode === "dashboard" ? DASHBOARD_LINKS : [];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/60 bg-bg-secondary/80 backdrop-blur-2xl safe-area-top safe-area-x">
        <div className="container-app flex h-16 items-center gap-3">
          <Link href={mode === "dashboard" ? "/dashboard" : "/"} className="flex shrink-0 items-center gap-2.5 group">
            <OnyxLogo size={34} />
            <span className="font-display text-base font-bold tracking-tight text-text-primary group-hover:text-brand transition-colors">
              {BRAND.name}
            </span>
          </Link>

          {mode === "dashboard" && (
            <nav className="hidden flex-1 items-center gap-1 overflow-x-auto scroll-x lg:flex lg:px-4">
              {links.map((link) => {
                const active = isActive(pathname, link.href, link.exact);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                      active
                        ? "nav-pill-active"
                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                    )}
                  >
                    {t(link.labelKey)}
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            {mode === "dashboard" && (
              <>
                <Link
                  href="/dashboard/transactions"
                  className="hidden rounded-xl p-2.5 text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary sm:inline-flex"
                  aria-label={t("dashboard.openTransactions")}
                >
                  <Receipt className="h-[18px] w-[18px]" />
                </Link>
                <NotificationBell />
              </>
            )}

            <ThemeToggle className="hidden sm:inline-flex" />
            <LanguageSelector className="hidden sm:block" />

            {mode === "dashboard" ? (
              <Link
                href="/dashboard/settings/profile"
                className="hidden items-center gap-2 rounded-full border border-border/80 bg-bg-tertiary/80 py-1 pl-1 pr-3 backdrop-blur-sm transition-colors hover:border-brand/30 sm:flex"
              >
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-brand text-xs font-bold text-white shadow-[var(--shadow-glow)]">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initial
                  )}
                </span>
                <span className="max-w-[120px] truncate text-sm font-medium text-text-primary">
                  {userName || userEmail?.split("@")[0] || "User"}
                </span>
              </Link>
            ) : (
              authActions
            )}

            {mode !== "dashboard" && (
              <button
                type="button"
                className="rounded-xl p-2 text-text-secondary hover:bg-bg-hover lg:hidden"
                onClick={() => setMenuOpen(true)}
                aria-label={t("nav.openMenu")}
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/20 mobile-nav-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-label={t("nav.closeMenu")}
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(320px,88vw)] flex-col border-l border-border bg-bg-secondary safe-area-top safe-area-bottom safe-area-x mobile-nav-drawer-right">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="font-bold">{BRAND.name}</span>
              <button type="button" onClick={() => setMenuOpen(false)} className="rounded-lg p-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "block rounded-xl px-4 py-3 text-sm font-medium",
                    isActive(pathname, link.href, link.exact)
                      ? "nav-pill-active"
                      : "text-text-secondary hover:bg-bg-hover"
                  )}
                >
                  {t(link.labelKey)}
                </Link>
              ))}
            </nav>
            <div className="border-t border-border p-3 space-y-3">
              <ThemeToggle showLabel className="w-full justify-start px-2" />
              <LanguageSelector showLabel />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
