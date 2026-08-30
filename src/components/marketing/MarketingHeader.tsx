"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BRAND } from "@/lib/constants";
import { MARKETING_MORE_LINKS, MARKETING_NAV } from "@/lib/marketing-nav";
import { OnyxLogo } from "@/components/brand/OnyxLogo";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { ChevronDown, Menu, X } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MarketingHeader() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  useBodyScrollLock(menuOpen);

  const isTerminalHome = pathname === "/";

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 border-b backdrop-blur-md safe-area-top safe-area-x tv-header",
          isTerminalHome
            ? "border-[#1A2332] bg-[#0B1222]/95"
            : "border-border bg-bg-secondary/95"
        )}
      >
        <div className="container-app flex h-[54px] items-center gap-2 sm:gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2 mr-1">
            <OnyxLogo size={28} />
            <span
              className={cn(
                "hidden sm:inline text-[15px] font-bold tracking-tight",
                isTerminalHome ? "text-white" : "text-text-primary"
              )}
            >
              {BRAND.name}
            </span>
          </Link>

          <nav className="hidden lg:flex flex-1 items-center gap-0.5">
            {MARKETING_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 text-[14px] font-medium rounded-md transition-colors",
                  isActive(pathname, item.href)
                    ? isTerminalHome
                      ? "text-[#43D9D9]"
                      : "text-brand"
                    : isTerminalHome
                      ? "text-[#787B86] hover:text-white hover:bg-[#151D2B]"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/60"
                )}
              >
                {item.label}
              </Link>
            ))}

            <div
              className="relative"
              onMouseEnter={() => setMoreOpen(true)}
              onMouseLeave={() => setMoreOpen(false)}
            >
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 text-[14px] font-medium rounded-md transition-colors",
                  MARKETING_MORE_LINKS.some((l) => isActive(pathname, l.href))
                    ? "text-brand"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/60"
                )}
              >
                More
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
              {moreOpen && (
                <div className="absolute left-0 top-full pt-1 min-w-[180px]">
                  <div className="rounded-lg border border-border bg-bg-secondary py-1 shadow-[var(--shadow-card)]">
                    {MARKETING_MORE_LINKS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block px-4 py-2 text-[13px] text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <LanguageSelector className="hidden md:block" />
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-[13px] h-9">
                {t("auth.login")}
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="h-9 px-4 text-[13px] font-semibold rounded-lg">
                Get started
              </Button>
            </Link>
            <button
              type="button"
              className="lg:hidden rounded-lg p-2 text-text-secondary hover:bg-bg-hover"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          />
          <div className="absolute right-0 top-0 h-full w-[min(300px,88vw)] border-l border-border bg-bg-secondary safe-area-top safe-area-bottom p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold">{BRAND.name}</span>
              <button type="button" onClick={() => setMenuOpen(false)} className="p-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {[...MARKETING_NAV, ...MARKETING_MORE_LINKS.map((l) => ({ label: l.label, href: l.href }))].map(
                (item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "block rounded-lg px-3 py-2.5 text-sm font-medium",
                      isActive(pathname, item.href) ? "text-brand bg-brand/10" : "text-text-secondary"
                    )}
                  >
                    {item.label}
                  </Link>
                )
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
