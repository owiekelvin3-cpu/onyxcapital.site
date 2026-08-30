"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bot } from "@/components/icons";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { adminAdjustAiBotProfit } from "@/lib/api/ai-trading";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

type AiSubRow = {
  id: string;
  user_id: string;
  bot_name: string;
  bot_id: string | null;
  allocation: number;
  crypto_asset: string | null;
  duration_hours: number | null;
  profit_earned: number;
  status: string;
  created_at: string;
  expires_at: string | null;
  profiles?: { email: string | null; full_name: string | null } | null;
};

type Filter = "active" | "completed" | "all";

export default function AdminAiTradingPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<AiSubRow[]>([]);
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
      .from("ai_trading_subscriptions")
      .select("*, profiles:user_id(email, full_name)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter === "active") query = query.eq("status", "active");
    if (filter === "completed") query = query.eq("status", "completed");

    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setRows((data as AiSubRow[]) ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const adjust = async (subId: string, signedAmount: number) => {
    if (!Number.isFinite(signedAmount) || signedAmount === 0) {
      setError(t("admin.aiPnLAmountInvalid"));
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const supabase = createClient();
      const data = await adminAdjustAiBotProfit(supabase, subId, signedAmount, note);
      const after = Number((data as { profit_after?: number })?.profit_after ?? 0);
      setSuccess(
        t("admin.aiPnLUpdated", {
          amount: formatCurrency(signedAmount),
          total: formatCurrency(after),
        })
      );
      setAmount("");
      setNote("");
      setOpenId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.aiPnLAmountInvalid"));
    } finally {
      setBusy(false);
    }
  };

  const submitSigned = (subId: string, mode: "profit" | "loss") => {
    const raw = Math.abs(parseFloat(amount));
    if (!Number.isFinite(raw) || raw <= 0) {
      setError(t("admin.aiPnLAmountInvalid"));
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
      <AdminPageHeader title={t("admin.aiTradingTitle")} subtitle={t("admin.aiTradingSubtitle")} />

      {error && (
        <p className="rounded-lg border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">{error}</p>
      )}
      {success && (
        <p className="rounded-lg border border-green/30 bg-green/10 px-4 py-3 text-sm text-green">
          {success}
        </p>
      )}

      <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:rounded-xl sm:border sm:border-border sm:bg-bg-secondary/30 sm:p-1">
        {(
          [
            ["active", t("admin.aiFilterActive")],
            ["completed", t("admin.aiFilterCompleted")],
            ["all", t("admin.aiFilterAll")],
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
          <h2 className="text-sm font-semibold text-text-primary">{t("admin.aiRuns")}</h2>
        </div>

        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-tertiary">{t("admin.aiRunsEmpty")}</p>
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
                        <Bot className="h-4 w-4 text-brand" />
                        <p className="font-medium text-text-primary">{row.bot_name}</p>
                        <StatusBadge status={row.status} />
                      </div>
                      <p className="mt-1 truncate text-sm text-text-tertiary">
                        {row.profiles?.full_name || row.profiles?.email || row.user_id.slice(0, 8)}
                        {row.profiles?.email && row.profiles?.full_name
                          ? ` · ${row.profiles.email}`
                          : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        {row.crypto_asset || "BTC"} · {formatCurrency(row.allocation)} ·{" "}
                        {row.duration_hours ?? "—"}h · {formatDate(row.created_at)}
                        {row.expires_at ? ` → ${formatDate(row.expires_at)}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 sm:text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                        {t("admin.aiCurrentPnL")}
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
                            label={t("admin.aiPnLAmount")}
                            type="number"
                            min={0.01}
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="100"
                          />
                          <Input
                            label={t("admin.aiPnLNote")}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={t("admin.aiPnLNotePlaceholder")}
                          />
                          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
                            <Button
                              disabled={busy}
                              onClick={() => submitSigned(row.id, "profit")}
                              className="flex-1"
                            >
                              {t("admin.aiAddProfit")}
                            </Button>
                            <Button
                              variant="secondary"
                              disabled={busy}
                              onClick={() => submitSigned(row.id, "loss")}
                              className="flex-1 !text-red"
                            >
                              {t("admin.aiAddLoss")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-text-tertiary">{t("admin.aiPnLOnlyActive")}</p>
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
