"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BRAND } from "@/lib/constants";
import { MARKETING_MORE_LINKS, MARKETING_NAV } from "@/lib/marketing-nav";
import { OnyxLogo } from "@/components/brand/OnyxLogo";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";
import {
  ArrowRight,
  Bot,
  Globe,
  LayoutDashboard,
  Menu,
  Star,
  TrendingUp,
  Users,
  Wallet,
  Layers,
  X,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

const SIDEBAR = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/products", icon: Wallet, label: "Products" },
  { href: "/community", icon: Users, label: "Community" },
  { href: "/markets", icon: Globe, label: "Markets" },
  { href: "/trading", icon: TrendingUp, label: "Trading" },
  { href: "/features", icon: Star, label: "Features" },
  { href: "/plans", icon: Layers, label: "Plans" },
  { href: "/dashboard/ai-trading", icon: Bot, label: "AI" },
] as const;

const MOBILE_PRIMARY = MARKETING_NAV.map((item) => {
  const match = SIDEBAR.find((s) => s.href === item.href);
  return { ...item, icon: match?.icon ?? Globe };
});

const MOBILE_MORE = MARKETING_MORE_LINKS.map((item) => {
  const match = SIDEBAR.find((s) => s.href === item.href);
  return { label: item.label, href: item.href, icon: match?.icon ?? Star };
});

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function FinMarketingSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fin-sidebar hidden w-[72px] shrink-0 flex-col items-center gap-2 border-r py-5 lg:flex">
      <Link
        href="/"
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-bg-secondary shadow-sm"
        title={BRAND.fullName}
      >
        <OnyxLogo size={24} />
      </Link>
      <nav className="flex flex-1 flex-col items-center gap-2">
        {SIDEBAR.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300",
                active
                  ? "scale-105 bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] shadow-lg"
                  : "text-text-tertiary hover:scale-105 hover:bg-bg-secondary hover:text-text-primary"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </Link>
          );
        })}
      </nav>
      <ThemeToggle className="rounded-xl border border-border bg-bg-secondary" />
    </aside>
  );
}

export function FinMarketingMobileBar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  useBodyScrollLock(menuOpen);

  return (
    <>
      <header className="fin-mobile-bar sticky top-0 z-50 flex items-center justify-between border-b px-4 py-3 backdrop-blur-md safe-area-top safe-area-x lg:hidden">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg-secondary shadow-sm">
            <OnyxLogo size={20} />
          </span>
          <span className="truncate font-bold text-text-primary">{BRAND.fullName}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link href="/register" className="hidden sm:inline-flex">
            <Button size="sm" className="fin-btn-primary h-8 rounded-full px-3 text-xs">
              Join
            </Button>
          </Link>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
            className="fin-mobile-menu-btn flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg-secondary text-text-primary"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-[70] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className="fin-mobile-drawer absolute inset-y-0 right-0 flex w-[min(320px,92vw)] flex-col safe-area-top safe-area-bottom"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            >
              <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
                <div className="flex items-center gap-2">
                  <OnyxLogo size={22} />
                  <div>
                    <p className="text-sm font-bold text-text-primary">{BRAND.name}</p>
                    <p className="text-[11px] text-text-tertiary">Charts</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-bg-primary text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-4 py-4">
                <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-text-tertiary">
                  Explore
                </p>
                <ul className="space-y-1">
                  {MOBILE_PRIMARY.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            "fin-mobile-nav-link flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors",
                            active
                              ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]"
                              : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 opacity-80" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <p className="mb-2 mt-5 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-text-tertiary">
                  More
                </p>
                <ul className="space-y-1">
                  {MOBILE_MORE.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            "fin-mobile-nav-link flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                            active
                              ? "bg-[var(--nav-active-bg)] font-medium text-[var(--nav-active-text)]"
                              : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 opacity-70" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="space-y-3 border-t border-border/80 p-4">
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="fin-btn-primary flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold"
                >
                  Open free account
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="flex items-center gap-2">
                  <LanguageSelector />
                  <ThemeToggle showLabel className="flex-1 justify-center rounded-xl border border-border px-2" />
                </div>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block text-center text-sm text-text-secondary hover:text-text-primary"
                >
                  {t("auth.login")}
                </Link>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function FinPageActions() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/register"
        className="fin-btn-primary flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
        aria-label="Get started"
      >
        +
      </Link>
      <Link
        href="/dashboard"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-secondary text-text-primary shadow-md transition-transform hover:scale-105"
        aria-label="Open dashboard"
      >
        ↑
      </Link>
    </div>
  );
}
