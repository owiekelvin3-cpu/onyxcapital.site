"use client";

import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAdminStats } from "@/hooks/useAdminStats";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  FileCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  ChevronRight,
  Comments,
} from "@/components/icons";

const QUICK_LINKS = [
  { href: "/admin/kyc", label: "KYC Review", icon: FileCheck, statKey: "pendingKyc" as const },
  { href: "/admin/crypto-deposits", label: "Crypto Deposits", icon: ArrowDownToLine, statKey: "pendingCryptoDeposits" as const },
  { href: "/admin/deposits", label: "Other Deposits", icon: ArrowDownToLine, statKey: "pendingOtherDeposits" as const },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpFromLine, statKey: "pendingWithdrawals" as const },
  { href: "/admin/support", label: "Support", icon: Comments, statKey: null },
  { href: "/admin/users", label: "Users", icon: Users, statKey: "totalUsers" as const },
];

export default function AdminOverviewPage() {
  const { stats, loading, refresh } = useAdminStats();
  const attention = stats.pendingKyc + stats.pendingDeposits + stats.pendingWithdrawals + stats.unreadSupport;

  return (
    <div className="space-y-6 max-w-6xl">
      <AdminPageHeader
        title="Overview"
        subtitle="Monitor queues, users, and platform activity."
        notificationCount={attention}
        action={
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <Card className="bg-gradient-to-br from-brand/10 via-bg-secondary to-bg-secondary border-brand/20">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">Needs attention</p>
        <p className="text-3xl sm:text-4xl font-bold text-text-primary mt-2">
          {loading ? "—" : attention}
        </p>
        <p className="text-sm text-text-tertiary mt-1">Pending KYC, deposits, withdrawals, and unread support</p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Link href="/admin/crypto-deposits" className="w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto">Review crypto deposits</Button>
          </Link>
          <Link href="/admin/deposits" className="w-full sm:w-auto">
            <Button size="sm" variant="outline" className="w-full sm:w-auto">Other deposits</Button>
          </Link>
          <Link href="/admin/withdrawals" className="w-full sm:w-auto">
            <Button size="sm" variant="outline" className="w-full sm:w-auto">Review withdrawals</Button>
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {[
          { label: "Total users", value: stats.totalUsers },
          { label: "Pending deposits", value: stats.pendingDeposits },
          { label: "Pending withdrawals", value: stats.pendingWithdrawals },
          { label: "Pending KYC", value: stats.pendingKyc },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <p className="text-[11px] text-text-tertiary uppercase tracking-wide">{item.label}</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{loading ? "—" : item.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-[11px] text-text-tertiary uppercase tracking-wide">Completed deposit volume</p>
          <p className="text-xl font-bold text-green mt-1">{loading ? "—" : formatCurrency(stats.totalDeposits)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] text-text-tertiary uppercase tracking-wide">Completed withdrawal volume</p>
          <p className="text-xl font-bold text-text-primary mt-1">{loading ? "—" : formatCurrency(stats.totalWithdrawals)}</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-text-primary mb-3">Quick links</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 hover:border-brand/40 hover:bg-bg-hover transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{link.label}</p>
                  <p className="text-xs text-text-tertiary">
                    {link.statKey
                      ? loading
                        ? "—"
                        : `${stats[link.statKey]} total`
                      : "Live customer messages"}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-text-tertiary" />
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
