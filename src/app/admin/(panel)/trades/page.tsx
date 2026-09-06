"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AdminTradeRow } from "@/lib/admin-types";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { RefreshCw } from "@/components/icons";

type Filter = "all" | "buy" | "sell";

function tradeNotional(row: AdminTradeRow) {
  return Number(row.amount) * Number(row.price);
}

export default function AdminTradesPage() {
  const [rows, setRows] = useState<AdminTradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("trades")
      .select("id, user_id, asset, type, amount, price, status, profit, created_at, profiles(email, full_name)")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows(
      ((data ?? []) as Array<Omit<AdminTradeRow, "profiles"> & { profiles?: AdminTradeRow["profiles"] | AdminTradeRow["profiles"][] }>).map(
        (row) => ({
          ...row,
          profiles: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null,
        })
      )
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-live-trades")
      .on("postgres_changes", { event: "*", schema: "public", table: "trades" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const filtered = rows.filter((row) => {
    if (filter === "buy") return row.type === "buy";
    if (filter === "sell") return row.type === "sell";
    return true;
  });

  const recentCount = rows.filter(
    (row) => Date.now() - new Date(row.created_at).getTime() < 24 * 60 * 60 * 1000
  ).length;

  return (
    <div className="space-y-5 max-w-5xl">
      <AdminPageHeader
        title="Live trades"
        subtitle="Get notified when a user places a buy or sell on Live Trading."
        notificationCount={recentCount}
        action={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <AdminFilterBar
        value={filter}
        onChange={setFilter}
        options={[
          { key: "all", label: "All", count: rows.length },
          { key: "buy", label: "Buys", count: rows.filter((row) => row.type === "buy").length },
          { key: "sell", label: "Sells", count: rows.filter((row) => row.type === "sell").length },
        ]}
      />

      <Card className="overflow-hidden p-0">
        {loading ? (
          <p className="p-8 text-center text-sm text-text-tertiary">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-text-tertiary">No live trades yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((row) => {
              const userLabel = row.profiles?.full_name || row.profiles?.email || row.user_id.slice(0, 8);
              const buy = row.type === "buy";
              return (
                <li key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">{userLabel}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                          buy ? "bg-green/10 text-green" : "bg-red/10 text-red"
                        )}
                      >
                        {row.type}
                      </span>
                      <StatusBadge status={row.status} />
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      {row.asset} · {Number(row.amount).toLocaleString(undefined, { maximumFractionDigits: 8 })}{" "}
                      @ {formatCurrency(Number(row.price))}
                    </p>
                    <p className="mt-0.5 text-xs text-text-tertiary">
                      {row.profiles?.email} · {formatDate(row.created_at)}
                    </p>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-text-primary">
                    {formatCurrency(tradeNotional(row))}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
