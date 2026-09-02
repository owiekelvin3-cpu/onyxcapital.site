"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  Bot,
  Coins,
  Comments,
  FileCheck,
  LayoutDashboard,
  LineChart,
  LogOut,
  MoreHorizontal,
  Receipt,
  Settings,
  Share,
  Users,
  Wallet,
  X,
  Zap,
} from "@/components/icons";

const MOBILE_TABS = [
  { labelKey: "dashboard.dock.home", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "dashboard.copyTrading", href: "/dashboard/copy-trading", icon: Users, featured: true },
  { labelKey: "dashboard.navWithdraw", href: "/dashboard/withdraw", icon: ArrowUpFromLine },
  { labelKey: "nav.more", href: null, icon: MoreHorizontal },
] as const;

const MORE_MENU_ITEMS = [
  { href: "/dashboard/deposit", labelKey: "dashboard.navDeposit", icon: ArrowDownToLine },
  { href: "/dashboard/trade", labelKey: "dashboard.navTrade", icon: LineChart },
  { href: "/dashboard/holdings", labelKey: "dashboard.navHoldings", icon: Coins },
  { href: "/dashboard/portfolio", labelKey: "dashboard.navPortfolio", icon: Wallet },
  { href: "/dashboard/transactions", labelKey: "dashboard.transactions", icon: Receipt },
  { href: "/dashboard/notifications", labelKey: "dashboard.notifications", icon: Bell },
  { href: "/dashboard/ai-trading", labelKey: "dashboard.aiTrading", icon: Bot },
  { href: "/dashboard/referrals", labelKey: "dashboard.referrals", icon: Share },
  { href: "/dashboard/signals", labelKey: "dashboard.signals", icon: Zap },
  { href: "/dashboard/kyc", labelKey: "dashboard.kyc", icon: FileCheck },
  { href: "/dashboard/support", labelKey: "dashboard.support", icon: Comments },
  { href: "/dashboard/settings", labelKey: "dashboard.settings", icon: Settings },
] as const;

const MORE_MENU_PATHS = MORE_MENU_ITEMS.map((item) => item.href);

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isMoreMenuActive(pathname: string) {
  return MORE_MENU_PATHS.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
}

type DeckoMobileDockProps = {
  menuOpen: boolean;
  onMenuOpen: () => void;
  onMenuClose: () => void;
  onLogout: () => void;
};

export function DeckoMobileDock({
  menuOpen,
  onMenuOpen,
  onMenuClose,
  onLogout,
}: DeckoMobileDockProps) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <>
      <div className="decko-mobile-dock pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.5rem,var(--safe-bottom))] safe-area-x lg:hidden">
        <nav
          className="pointer-events-auto mx-auto max-w-[420px] overflow-visible rounded-[24px] border border-[var(--decko-dock-border)] bg-[var(--decko-dock-bg)] p-1 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
          aria-label={t("dashboard.navLabel")}
        >
          <div className="grid grid-cols-4 items-center gap-0.5">
            {MOBILE_TABS.map((item) => {
              const Icon = item.icon;
              const isMore = item.href === null;
              const active = isMore
                ? menuOpen || isMoreMenuActive(pathname)
                : isActive(pathname, item.href!);
              const featured = "featured" in item && item.featured;

              const inner = (
                <>
                  {!featured && active && (
                    <motion.span
                      layoutId="decko-dock-active"
                      className="absolute inset-0 rounded-[18px] bg-[var(--decko-accent)]/18"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span
                    className={cn(
                      "relative flex items-center justify-center rounded-2xl transition-all duration-200",
                      featured
                        ? "h-11 w-11 rounded-full bg-[var(--decko-accent)] text-[#111111] shadow-[0_6px_18px_rgba(226,255,76,0.4)]"
                        : cn(
                            "h-9 w-9",
                            active ? "text-[var(--decko-accent)]" : "text-[#9CA3AF]"
                          )
                    )}
                  >
                    <Icon className={cn("shrink-0", featured ? "h-5 w-5" : "h-[18px] w-[18px]")} />
                  </span>
                  <span
                    className={cn(
                      "relative mt-1 max-w-[72px] truncate text-[11px] font-medium leading-none",
                      active || featured ? "text-white" : "text-[#737373]"
                    )}
                  >
                    {t(item.labelKey)}
                  </span>
                </>
              );

              const tabClass =
                "relative flex min-h-[62px] flex-col items-center justify-center px-1 py-1.5 touch-target";

              if (isMore) {
                return (
                  <button
                    key={item.labelKey}
                    type="button"
                    onClick={onMenuOpen}
                    className={tabClass}
                    aria-label={t("nav.more")}
                    aria-expanded={menuOpen}
                  >
                    {inner}
                  </button>
                );
              }

              return (
                <Link key={item.href} href={item.href!} className={tabClass}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              onClick={onMenuClose}
              aria-label={t("common.close")}
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="absolute bottom-0 left-0 right-0 overflow-hidden rounded-t-[24px] border-t border-border bg-bg-secondary pb-[max(0.75rem,var(--safe-bottom))] shadow-[0_-16px_48px_rgba(0,0,0,0.16)]"
            >
              <div className="flex justify-center pt-2.5">
                <span className="h-1 w-9 rounded-full bg-border" aria-hidden />
              </div>

              <div className="flex items-center justify-between px-4 pb-2 pt-1.5">
                <p className="text-sm font-bold text-text-primary">{t("nav.more")}</p>
                <button
                  type="button"
                  onClick={onMenuClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-tertiary text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                  aria-label={t("common.close")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="px-3 pb-2">
                <div className="grid grid-cols-4 gap-1.5">
                  {MORE_MENU_ITEMS.map((item, i) => {
                    const Icon = item.icon;
                    const active = isActive(pathname, item.href);
                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.03 + i * 0.025 }}
                      >
                        <Link
                          href={item.href}
                          onClick={onMenuClose}
                          className="group flex flex-col items-center gap-1 rounded-xl p-1 text-center"
                        >
                          <span
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 group-active:scale-95",
                              active
                                ? "bg-[var(--decko-accent)] text-[var(--decko-accent-text)] shadow-[0_6px_16px_rgba(226,255,76,0.3)]"
                                : "bg-bg-tertiary text-text-primary group-hover:bg-bg-hover"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span
                            className={cn(
                              "line-clamp-2 min-h-[2rem] w-full text-[10px] font-medium leading-tight",
                              active ? "text-text-primary" : "text-text-secondary"
                            )}
                          >
                            {t(item.labelKey)}
                          </span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onMenuClose();
                    onLogout();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red/20 bg-red/8 px-3 py-2.5 text-xs font-semibold text-red transition-colors active:bg-red/12"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {t("common.signOut")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export { isMoreMenuActive, isActive as isDockActive };
