"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

function baseAsset(symbol: string) {
  const base = symbol.split("/")[0]?.trim().toUpperCase();
  return base || symbol.trim().toUpperCase();
}

function roundQty(value: number) {
  return Math.round(value * 1e8) / 1e8;
}

/** Later sells close earlier buys of the same coin, oldest first. */
function closedQuantityByTrade(rows: AdminTradeRow[]) {
  const closed = new Map<string, number>();
  const queues = new Map<string, { id: string; remaining: number }[]>();
  const ordered = [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const row of ordered) {
    const key = `${row.user_id}:${baseAsset(row.asset)}`;
    const queue = queues.get(key) ?? [];
    const qty = Number(row.amount);
    if (row.type === "buy") {
      queue.push({ id: row.id, remaining: qty });
      queues.set(key, queue);
      continue;
    }
    let left = qty;
    while (left > 1e-8 && queue.length > 0) {
      const head = queue[0];
      const take = Math.min(head.remaining, left);
      head.remaining -= take;
      left -= take;
      closed.set(head.id, (closed.get(head.id) ?? 0) + take);
      if (head.remaining <= 1e-8) queue.shift();
    }
    queues.set(key, queue);
  }

  return closed;
}

export default function AdminTradesPage() {
  const [rows, setRows] = useState<AdminTradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [profitDraft, setProfitDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const closedById = useMemo(() => closedQuantityByTrade(rows), [rows]);

  const filtered = rows.filter((row) => {
    if (filter === "buy") return row.type === "buy";
    if (filter === "sell") return row.type === "sell";
    return true;
  });

  const recentCount = rows.filter(
    (row) => Date.now() - new Date(row.created_at).getTime() < 24 * 60 * 60 * 1000
  ).length;

  function openRemainder(row: AdminTradeRow) {
    return Math.max(0, roundQty(Number(row.amount) - (closedById.get(row.id) ?? 0)));
  }

  async function addProfit(row: AdminTradeRow) {
    const amount = Number(profitDraft[row.id]);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a profit amount greater than zero.");
      setSuccess("");
      return;
    }
    setBusyId(row.id);
    setError("");
    setSuccess("");
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("admin_add_trade_profit", {
      p_trade_id: row.id,
      p_amount: Math.round(amount * 100) / 100,
      p_note: null,
    });
    setBusyId(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setProfitDraft((current) => ({ ...current, [row.id]: "" }));
    setSuccess(`Profit of ${formatCurrency(amount)} added. You can close the trade when you are ready.`);
    await load();
  }

  async function closeTrade(row: AdminTradeRow) {
    if (confirmId !== row.id) {
      setConfirmId(row.id);
      setError("");
      return;
    }
    const remainder = openRemainder(row);
    if (remainder <= 0) {
      setError("That trade is already closed.");
      setConfirmId(null);
      return;
    }

    setBusyId(row.id);
    setError("");
    setSuccess("");
    const supabase = createClient();
    const asset = baseAsset(row.asset);
    const { data: holding, error: holdingError } = await supabase
      .from("holdings")
      .select("quantity")
      .eq("user_id", row.user_id)
      .eq("asset", asset)
      .maybeSingle();

    if (holdingError) {
      setBusyId(null);
      setError(holdingError.message);
      return;
    }

    const held = Number(holding?.quantity ?? 0);
    const qty = roundQty(Math.min(remainder, held));
    if (qty <= 0) {
      setBusyId(null);
      setConfirmId(null);
      setError("That position is already closed.");
      await load();
      return;
    }

    const { error: insertError } = await supabase.from("trades").insert({
      user_id: row.user_id,
      asset: row.asset,
      type: "sell",
      amount: qty,
      price: Number(row.price),
      status: "completed",
    });
    setBusyId(null);
    setConfirmId(null);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSuccess(`${row.asset} trade closed. ${formatCurrency(qty * Number(row.price))} was returned to the account.`);
    await load();
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <AdminPageHeader
        title="Live trades"
        subtitle="Add profit to a buy, then close it. Closing sells the position and returns the trade amount."
        notificationCount={recentCount}
        action={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {error && (
        <p className="rounded-lg border border-red/30 bg-red/10 px-4 py-3 text-sm text-red">{error}</p>
      )}
      {success && (
        <p className="rounded-lg border border-green/30 bg-green/10 px-4 py-3 text-sm text-green">{success}</p>
      )}

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
              const remainder = buy ? openRemainder(row) : 0;
              const open = buy && remainder > 0;
              const profit = Number(row.profit ?? 0);
              const busy = busyId === row.id;
              return (
                <li key={row.id} className="flex flex-col gap-3 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
                        <StatusBadge status={open ? "pending" : row.status} />
                        {buy && !open && (
                          <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase text-text-tertiary">
                            Closed
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        {row.asset} · {Number(row.amount).toLocaleString(undefined, { maximumFractionDigits: 8 })}{" "}
                        @ {formatCurrency(Number(row.price))}
                      </p>
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        {row.profiles?.email} · {formatDate(row.created_at)}
                        {profit > 0 ? ` · Profit ${formatCurrency(profit)}` : ""}
                      </p>
                    </div>
                    <p className="text-lg font-bold tabular-nums text-text-primary">
                      {formatCurrency(tradeNotional(row))}
                    </p>
                  </div>

                  {open && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="number"
                        min={0.01}
                        step="0.01"
                        inputMode="decimal"
                        placeholder="Profit amount"
                        value={profitDraft[row.id] ?? ""}
                        onChange={(event) =>
                          setProfitDraft((current) => ({ ...current, [row.id]: event.target.value }))
                        }
                        className="h-10 w-full rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary sm:max-w-[180px]"
                      />
                      <Button size="sm" disabled={busy} onClick={() => void addProfit(row)}>
                        Add profit
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void closeTrade(row)}
                      >
                        {confirmId === row.id ? "Confirm close" : "Close trade"}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
