"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Users } from "@/components/icons";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { adminAdjustCopyTradingProfit } from "@/lib/api/copy-trading";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

type CopySubRow = {
  id: string;
  user_id: string;
  trader_name: string;
  allocation: number;
  profit_earned: number;
  status: string;
  created_at: string;
  profiles?: { email: string | null; full_name: string | null } | null;
};

type Filter = "active" | "all";

export default function AdminCopyTradingPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<CopySubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const [openId, setOpenId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    let query = supabase
      .from("copy_trading_subscriptions")
      .select("*, profiles:user_id(email, full_name)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter === "active") query = query.eq("status", "active");

    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setRows((data as CopySubRow[]) ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const adjust = async (subId: string, signedAmount: number) => {
    if (!Number.isFinite(signedAmount) || signedAmount === 0) {
      setError(t("admin.copyTradingAmountInvalid"));
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const supabase = createClient();
      const data = await adminAdjustCopyTradingProfit(supabase, subId, signedAmount, note);
      setSuccess(
        t("admin.copyTradingProfitUpdated", {
          amount: formatCurrency(signedAmount),
          total: formatCurrency(Number(data.profit_after ?? 0)),
          balance: formatCurrency(Number(data.balance_after ?? 0)),
        })
      );
      setAmount("");
      setNote("");
      setOpenId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.copyTradingAmountInvalid"));
    } finally {
      setBusy(false);
    }
  };

  const submitSigned = (subId: string, mode: "profit" | "loss") => {
    const raw = Math.abs(parseFloat(amount));
    if (!Number.isFinite(raw) || raw <= 0) {
      setError(t("admin.copyTradingAmountInvalid"));
      return;
    }
    void adjust(subId, mode === "profit" ? raw : -raw);
  };

  if (loading && rows.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-text-tertiary">
        {t("common.loading")}…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("admin.copyTradingTitle")}
        subtitle={t("admin.copyTradingSubtitle")}
      />

      {error && (
        <p className="rounded-lg border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">{error}</p>
      )}
      {success && (
        <p className="rounded-lg border border-green/30 bg-green/10 px-4 py-3 text-sm text-green">
          {success}
        </p>
      )}

      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:rounded-xl sm:border sm:border-border sm:bg-bg-secondary/30 sm:p-1">
        {(
          [
            ["active", t("admin.copyTradingFilterActive")],
            ["all", t("admin.copyTradingFilterAll")],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              "min-h-10 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors sm:py-2",
              filter === id
                ? "bg-bg-primary text-text-primary shadow-sm"
                : "text-text-tertiary hover:text-text-primary"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-bg-secondary/40 overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">{t("admin.copyTradingRuns")}</h2>
        </div>

        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-tertiary">{t("admin.copyTradingRunsEmpty")}</p>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((row) => {
              const open = openId === row.id;
              const profit = Number(row.profit_earned ?? 0);
              const canAdjust = row.status === "active";
              return (
                <div key={row.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-2 px-4 py-3.5 text-left hover:bg-bg-hover/40 sm:flex-row sm:items-center sm:justify-between"
                    onClick={() => setOpenId(open ? null : row.id)}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Users className="h-4 w-4 text-brand" />
                        <p className="font-medium text-text-primary">{row.trader_name}</p>
                        <StatusBadge status={row.status} />
                      </div>
                      <p className="mt-1 truncate text-sm text-text-tertiary">
                        {row.profiles?.full_name || row.profiles?.email || row.user_id.slice(0, 8)}
                        {row.profiles?.email && row.profiles?.full_name
                          ? ` · ${row.profiles.email}`
                          : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        {t("admin.copyTradingSince", { date: formatDate(row.created_at) })}
                      </p>
                    </div>
                    <div className="shrink-0 sm:text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                        {t("admin.copyTradingCurrentPnL")}
                      </p>
                      <p
                        className={cn(
                          "text-lg font-semibold tabular-nums",
                          profit >= 0 ? "text-green" : "text-red"
                        )}
                      >
                        {profit >= 0 ? "+" : ""}
                        {formatCurrency(profit)}
                      </p>
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-border bg-bg-primary/40 px-4 py-4">
                      {canAdjust ? (
                        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                          <Input
                            label={t("admin.copyTradingAmount")}
                            type="number"
                            min={0.01}
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="100"
                          />
                          <Input
                            label={t("admin.copyTradingNote")}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={t("admin.copyTradingNotePlaceholder")}
                          />
                          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
                            <Button
                              disabled={busy}
                              onClick={() => submitSigned(row.id, "profit")}
                              className="flex-1"
                            >
                              {t("admin.copyTradingAddProfit")}
                            </Button>
                            <Button
                              variant="secondary"
                              disabled={busy}
                              onClick={() => submitSigned(row.id, "loss")}
                              className="flex-1 !text-red"
                            >
                              {t("admin.copyTradingAddLoss")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-text-tertiary">{t("admin.copyTradingOnlyActive")}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
