"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { OnyxLogo } from "@/components/brand/OnyxLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SuspendedAvatarBadge } from "@/components/dashboard/AccountSuspendedBanner";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Bot,
  FileCheck,
  HelpCircle,
  LayoutDashboard,
  LineChart,
  LogOut,
  Receipt,
  Search,
  Settings,
  Share,
  Shield,
  Users,
  Coins,
  Wallet,
  Zap,
} from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { clearAdminSession } from "@/lib/auth-guards";
import { useDashboardSearch } from "@/components/dashboard/DashboardSearchProvider";

const MAIN_MENU = [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true },
      { label: "Live Trading", href: "/dashboard/trade", icon: LineChart },
      { label: "Holdings", href: "/dashboard/holdings", icon: Coins },
      { label: "Portfolio", href: "/dashboard/portfolio", icon: Wallet },
  { label: "Deposit", href: "/dashboard/deposit", icon: ArrowDownToLine },
  { label: "Withdraw", href: "/dashboard/withdraw", icon: ArrowUpFromLine },
  { label: "Transactions", href: "/dashboard/transactions", icon: Receipt },
  { label: "AI Trading", href: "/dashboard/ai-trading", icon: Bot },
  { label: "Copy Trading", href: "/dashboard/copy-trading", icon: Users },
  { label: "Referrals", href: "/dashboard/referrals", icon: Share },
  { label: "Trading Signals", href: "/dashboard/signals", icon: Zap },
  { label: "Market Analytics", href: "/dashboard/analytics", icon: LineChart },
] as const;

const SETTINGS_MENU = [
  { label: "KYC Verification", href: "/dashboard/kyc", icon: FileCheck },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Security & Privacy", href: "/dashboard/settings/account", icon: Shield },
  { label: "Help Center", href: "/dashboard/support", icon: HelpCircle },
] as const;

function navActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DeckoSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const { openSearch } = useDashboardSearch();

  async function logout() {
    const supabase = createClient();
    await clearAdminSession();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="decko-sidebar hidden h-dvh w-[248px] shrink-0 flex-col overflow-hidden px-4 py-5 lg:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--decko-accent)]">
          <OnyxLogo size={22} />
        </span>
        <span className="text-lg font-bold text-[var(--decko-sidebar-text)]">{BRAND.name}</span>
      </Link>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--decko-sidebar-muted)]" />
        <input
          type="search"
          readOnly
          value=""
          onClick={openSearch}
          onFocus={openSearch}
          placeholder={t("dashboard.searchPlaceholder")}
          aria-label={t("dashboard.searchPlaceholder")}
          className="h-10 w-full cursor-pointer rounded-xl border border-[var(--decko-sidebar-border)] bg-[var(--decko-sidebar-input)] pl-10 pr-12 text-sm text-[var(--decko-sidebar-text)] placeholder:text-[var(--decko-sidebar-muted)] outline-none focus:border-[var(--decko-accent)]/40"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-[var(--decko-sidebar-hover)] px-1.5 py-0.5 text-[10px] text-[var(--decko-sidebar-muted)]">
          ⌘K
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--decko-sidebar-muted)]">
        Main Menu
      </p>
      <nav className="space-y-1">
        {MAIN_MENU.map((item) => {
          const Icon = item.icon;
          const active = navActive(pathname, item.href, "exact" in item ? item.exact : false);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-[var(--decko-accent)] text-[var(--decko-accent-text)] shadow-[0_8px_24px_rgba(212,255,66,0.25)]"
                  : "text-[var(--decko-sidebar-muted)] hover:bg-[var(--decko-sidebar-hover)] hover:text-[var(--decko-sidebar-text)]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <p className="mb-2 mt-6 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--decko-sidebar-muted)]">
        Settings
      </p>
      <nav className="space-y-1">
        {SETTINGS_MENU.map((item) => {
          const Icon = item.icon;
          const active = navActive(pathname, item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-[var(--decko-sidebar-hover)] text-[var(--decko-sidebar-text)]"
                  : "text-[var(--decko-sidebar-muted)] hover:bg-[var(--decko-sidebar-hover)] hover:text-[var(--decko-sidebar-text)]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      </div>

      <div className="mt-auto shrink-0 space-y-3 pt-6">
        <Link
          href="/dashboard/deposit"
          className="block rounded-2xl border border-[var(--decko-sidebar-border)] bg-[var(--decko-sidebar-surface)] p-4 transition-transform hover:scale-[1.02]"
        >
          <p className="text-[11px] uppercase tracking-wide text-[var(--decko-sidebar-muted)]">Upcoming Event</p>
          <p className="mt-1 text-sm font-semibold text-[var(--decko-sidebar-text)]">Fund your account</p>
          <span className="mt-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--decko-accent)] text-[var(--decko-accent-text)]">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        <ThemeToggle className="w-full justify-start rounded-xl border border-[var(--decko-sidebar-border)] bg-[var(--decko-sidebar-surface)] px-3 text-[var(--decko-sidebar-text)] hover:bg-[var(--decko-sidebar-hover)]" showLabel />

        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red transition-colors hover:bg-[var(--decko-sidebar-hover)]"
        >
          <LogOut className="h-4 w-4" />
          {t("common.signOut")}
        </button>
      </div>
    </aside>
  );
}

export function DeckoMobileTopBar({
  userName,
  userEmail,
  avatarUrl,
  isSuspended,
}: {
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  isSuspended?: boolean;
}) {
  const { t } = useTranslation();
  const { openSearch } = useDashboardSearch();
  const initial = (userName || userEmail || "U").charAt(0).toUpperCase();

  return (
    <div className="decko-mobile-bar flex items-center justify-between border-b px-4 py-3 safe-area-top safe-area-x lg:hidden">
      <Link href="/dashboard" className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--decko-accent)]">
          <OnyxLogo size={18} />
        </span>
        <span className="font-bold text-text-primary">{BRAND.name}</span>
      </Link>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openSearch}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover hover:text-text-primary"
          aria-label={t("dashboard.searchPlaceholder")}
        >
          <Search className="h-4 w-4" />
        </button>
        <ThemeToggle className="rounded-lg border border-border bg-bg-tertiary" />
        <div className="relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--fin-btn-bg)] text-xs font-bold text-[var(--fin-btn-fg)]">
              {initial}
            </span>
          )}
          {isSuspended && (
            <SuspendedAvatarBadge className="absolute -right-0.5 -top-0.5" />
          )}
        </div>
      </div>
    </div>
  );
}
