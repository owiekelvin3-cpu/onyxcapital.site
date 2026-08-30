"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSpotWalletDepositNotes } from "@/lib/spot-wallet-deposits";

export interface AdminStats {
  totalUsers: number;
  pendingKyc: number;
  pendingDeposits: number;
  pendingCryptoDeposits: number;
  pendingOtherDeposits: number;
  pendingWithdrawals: number;
  unreadSupport: number;
  totalDeposits: number;
  totalWithdrawals: number;
  activeTrades: number;
}

const EMPTY: AdminStats = {
  totalUsers: 0,
  pendingKyc: 0,
  pendingDeposits: 0,
  pendingCryptoDeposits: 0,
  pendingOtherDeposits: 0,
  pendingWithdrawals: 0,
  unreadSupport: 0,
  totalDeposits: 0,
  totalWithdrawals: 0,
  activeTrades: 0,
};

function countUnreadSupport(
  rows: { last_message_at: string; admin_last_read_at: string | null }[]
) {
  return rows.filter(
    (row) =>
      !row.admin_last_read_at ||
      new Date(row.last_message_at).getTime() > new Date(row.admin_last_read_at).getTime()
  ).length;
}

export function getAdminAttentionTotal(stats: AdminStats) {
  return stats.pendingKyc + stats.pendingDeposits + stats.pendingWithdrawals + stats.unreadSupport;
}

export type AdminNotificationStatKey =
  | "pendingKyc"
  | "pendingDeposits"
  | "pendingCryptoDeposits"
  | "pendingOtherDeposits"
  | "pendingWithdrawals"
  | "unreadSupport";

export const ADMIN_NOTIFICATION_ROUTES: Partial<Record<string, AdminNotificationStatKey>> = {
  "/admin/kyc": "pendingKyc",
  "/admin/deposits": "pendingOtherDeposits",
  "/admin/crypto-deposits": "pendingCryptoDeposits",
  "/admin/withdrawals": "pendingWithdrawals",
  "/admin/support": "unreadSupport",
};

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [users, kyc, deposits, withdrawals, trades, support] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("kyc_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("deposits").select("amount, status, method, notes"),
      supabase.from("withdrawals").select("amount, status"),
      supabase.from("trades").select("id", { count: "exact", head: true }).in("status", ["pending", "approved"]),
      supabase
        .from("support_conversations")
        .select("last_message_at, admin_last_read_at")
        .eq("archived", false),
    ]);

    const depData = deposits.data ?? [];
    const wData = withdrawals.data ?? [];

    const pending = depData.filter((d) => d.status === "pending");
    setStats({
      totalUsers: users.count ?? 0,
      pendingKyc: kyc.count ?? 0,
      pendingDeposits: pending.length,
      pendingCryptoDeposits: pending.filter((d) => isSpotWalletDepositNotes(d.notes)).length,
      pendingOtherDeposits: pending.filter((d) => !isSpotWalletDepositNotes(d.notes)).length,
      pendingWithdrawals: wData.filter((w) => w.status === "pending").length,
      unreadSupport: countUnreadSupport(support.data ?? []),
      totalDeposits: depData
        .filter((d) => d.status === "completed")
        .reduce((s, d) => s + Number(d.amount), 0),
      totalWithdrawals: wData
        .filter((w) => w.status === "completed")
        .reduce((s, w) => s + Number(w.amount), 0),
      activeTrades: trades.count ?? 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, loading, refresh };
}
