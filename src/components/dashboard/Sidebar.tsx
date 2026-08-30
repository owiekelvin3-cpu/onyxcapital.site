"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/constants";
import { clearAdminSession } from "@/lib/auth-guards";
import { cn } from "@/lib/utils";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import {
  FileCheck,
  LayoutDashboard,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Settings,
  LogOut,
  Bell,
  Bot,
  Users,
  Comments,
  Menu,
  X,
  MoreHorizontal,
} from "@/components/icons";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

const NAV_GROUPS = [
  {
    id: "overview",
    labelKey: "dashboard.navGroupOverview",
    items: [
      { labelKey: "dashboard.navDashboard", href: "/dashboard", icon: LayoutDashboard },
      { labelKey: "dashboard.navPortfolio", href: "/dashboard/portfolio", icon: Wallet },
    ],
  },
  {
    id: "cash",
    labelKey: "dashboard.navGroupCash",
    items: [
      { labelKey: "dashboard.navDeposit", href: "/dashboard/deposit", icon: ArrowDownToLine },
      { labelKey: "dashboard.navWithdraw", href: "/dashboard/withdraw", icon: ArrowUpFromLine },
    ],
  },
  {
    id: "tools",
    labelKey: "dashboard.navGroupTools",
    items: [
      { labelKey: "dashboard.aiTrading", href: "/dashboard/ai-trading", icon: Bot },
      { labelKey: "dashboard.copyTrading", href: "/dashboard/copy-trading", icon: Users },
    ],
  },
  {
    id: "account",
    labelKey: "dashboard.navGroupAccount",
    items: [
      { labelKey: "dashboard.kyc", href: "/dashboard/kyc", icon: FileCheck },
      { labelKey: "dashboard.support", href: "/dashboard/support", icon: Comments },
      { labelKey: "dashboard.settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
] as const;

const MOBILE_TABS = [
  { labelKey: "dashboard.dock.home", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "dashboard.copyTrading", href: "/dashboard/copy-trading", icon: Users },
  { labelKey: "dashboard.navPortfolio", href: "/dashboard/portfolio", icon: Wallet },
  { labelKey: "dashboard.navDeposit", href: "/dashboard/deposit", icon: ArrowDownToLine },
  { labelKey: "nav.more", href: null, icon: MoreHorizontal },
] as const;

const MORE_MENU_PATHS = [
  "/dashboard/kyc",
  "/dashboard/withdraw",
  "/dashboard/ai-trading",
  "/dashboard/copy-trading",
  "/dashboard/support",
  "/dashboard/settings",
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isMoreMenuActive(pathname: string) {
  return MORE_MENU_PATHS.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
}

/** Hide bottom tabs on immersive full-screen views (e.g. support chat). */
export function shouldHideMobileBottomNav(pathname: string) {
  return pathname.startsWith("/dashboard/support");
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {NAV_GROUPS.map((group) => (
        <div key={group.id} className="mb-5 last:mb-0">
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary/80">
            {t(group.labelKey)}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] transition-all",
                    active
                      ? "dashboard-nav-active text-brand font-semibold"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/70"
                  )}
                >
                  <Icon className="w-[17px] h-[17px] shrink-0" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

export function DashboardSidebar({
  userName,
  userEmail,
}: {
  userName?: string;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const initial = (userName || userEmail || "U").charAt(0).toUpperCase();

  async function handleLogout() {
    const supabase = createClient();
    await clearAdminSession();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="dashboard-sidebar hidden lg:flex relative z-20 h-dvh max-h-dvh w-[240px] xl:w-[256px] shrink-0 flex-col border-r border-border"
      aria-label={t("dashboard.navLabel")}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-border/80 px-5">
        <Link href="/" className="group flex min-w-0 items-center gap-2.5">
          <Logo size={24} />
          <span className="truncate font-bold text-sm tracking-tight text-text-primary transition-colors group-hover:text-brand">
            {BRAND.name}
          </span>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-4">
        <NavLinks pathname={pathname} />
      </nav>

      <div className="shrink-0 space-y-2 border-t border-border/80 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-bg-primary/40 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand/20 bg-gradient-to-br from-brand/30 to-brand/5 text-xs font-bold text-brand">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-text-primary">
              {userName || userEmail?.split("@")[0] || "Trader"}
            </p>
            <p className="truncate text-[11px] text-text-tertiary">{userEmail ?? "Account"}</p>
          </div>
          <LanguageSelector menuPlacement="top" showLabel />
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] text-text-tertiary transition-colors hover:bg-red/5 hover:text-red"
        >
          <LogOut className="w-4 h-4" />
          {t("common.signOut")}
        </button>
      </div>
    </aside>
  );
}

export function DashboardMobileFrame({
  children,
  userName,
  userEmail,
}: {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const hideBottomNav = shouldHideMobileBottomNav(pathname);
  useBodyScrollLock(menuOpen);

  async function handleLogout() {
    const supabase = createClient();
    await clearAdminSession();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-bg-primary/90 px-3 backdrop-blur-xl safe-area-top safe-area-x sm:px-4 lg:h-16 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="-ml-1 cursor-pointer rounded-lg p-2 text-text-secondary hover:text-text-primary active:bg-bg-hover lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label={t("dashboard.openSidebar")}
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/" className="flex min-w-0 items-center gap-2 lg:hidden">
            <Logo size={20} />
            <span className="truncate text-sm font-bold">{BRAND.name}</span>
          </Link>
          <p className="hidden text-sm font-medium text-text-tertiary lg:block">
            {t("dashboard.clientPortal")}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LanguageSelector className="lg:hidden" />
          <Link
            href="/dashboard/support"
            className="relative rounded-lg p-2 text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
            aria-label={t("dashboard.support")}
          >
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red" />
          </Link>
          <div className="flex min-w-0 items-center gap-2 border-l border-border/60 pl-1 lg:hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand/15 bg-gradient-to-br from-brand/25 to-brand/5 text-[11px] font-bold text-brand">
              {(userName || userEmail || "U").charAt(0).toUpperCase()}
            </div>
            <span className="hidden max-w-[140px] truncate text-[13px] text-text-secondary sm:block">
              {userName || userEmail?.split("@")[0] || "User"}
            </span>
          </div>
        </div>
      </header>

      <main
        className={cn(
          "relative z-[1] min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6",
          hideBottomNav
            ? "pb-[max(0.75rem,var(--safe-bottom))] lg:pb-6"
            : "pb-[calc(4.25rem+var(--safe-bottom))] lg:pb-6"
        )}
      >
        {children}
      </main>

      {!hideBottomNav && (
        <nav
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-bg-secondary/95 backdrop-blur-xl safe-area-x lg:hidden"
          aria-label={t("dashboard.navLabel")}
        >
          <div className="flex items-stretch justify-around px-1 pt-1.5 pb-[max(0.35rem,var(--safe-bottom))]">
            {MOBILE_TABS.map((item) => {
              const Icon = item.icon;
              const isMore = item.href === null;
              const active = isMore
                ? menuOpen || isMoreMenuActive(pathname)
                : isActive(pathname, item.href);

              const className = cn(
                "relative flex max-w-[80px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] leading-tight transition-colors",
                active ? "text-brand" : "text-text-tertiary active:text-text-secondary"
              );

              const content = (
                <>
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                      active ? "bg-brand/10" : ""
                    )}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                  </span>
                  <span className="w-full truncate text-center font-medium">{t(item.labelKey)}</span>
                </>
              );

              if (isMore) {
                return (
                  <button
                    key={item.labelKey}
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    className={className}
                    aria-label={t("dashboard.openSidebar")}
                    aria-expanded={menuOpen}
                  >
                    {content}
                  </button>
                );
              }

              return (
                <Link key={item.href} href={item.href} className={className}>
                  {content}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {menuOpen && (
        <div
          className="fixed inset-0 z-[60] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t("dashboard.navLabel")}
        >
          <button
            type="button"
            className="mobile-nav-backdrop absolute inset-0 bg-black/60"
            onClick={() => setMenuOpen(false)}
            aria-label={t("dashboard.closeSidebar")}
          />
          <div className="dashboard-sidebar mobile-nav-drawer absolute left-0 top-0 flex h-full w-[min(300px,88vw)] flex-col border-r border-border safe-area-top safe-area-bottom safe-area-x">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/80 px-4">
              <Link
                href="/"
                className="flex min-w-0 items-center gap-2"
                onClick={() => setMenuOpen(false)}
              >
                <Logo size={22} />
                <span className="truncate text-sm font-bold">{BRAND.name}</span>
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="-mr-1 cursor-pointer rounded-lg p-2 text-text-tertiary hover:text-text-primary active:bg-bg-hover"
                aria-label={t("dashboard.closeSidebar")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
              <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </nav>
            <div className="shrink-0 space-y-2 border-t border-border/80 p-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-text-tertiary">{t("common.language")}</span>
                <LanguageSelector showLabel />
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-3 text-[14px] text-text-tertiary transition-colors hover:bg-red/5 hover:text-red"
              >
                <LogOut className="w-[18px] h-[18px]" />
                {t("common.signOut")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Logo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect width="28" height="28" rx="6" fill="#F0B90B" />
      <path d="M8 18L14 8L20 18H16.5L14 14.5L11.5 18H8Z" fill="#0B0E11" />
    </svg>
  );
}
