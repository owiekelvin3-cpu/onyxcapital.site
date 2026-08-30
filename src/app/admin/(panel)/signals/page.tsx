"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import {
  bulkAdjustAdminSignalPct,
  grantAdminUserSignal,
  setAdminUserSignalPct,
} from "@/lib/admin-api";
import { SIGNAL_PLANS, signalTierLabel } from "@/lib/signal-plans";
import { getSignalStrength } from "@/lib/signal-strength";
import type { TradingSignalRow } from "@/lib/supabase/types";
import { cn, formatDate, formatPercent } from "@/lib/utils";
import { Loader2, Plus, RefreshCw } from "@/components/icons";

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  signal_pct: number;
  role: string;
};

type TabId = "allocation" | "desk";

const BULK_STEPS = [-10, -5, -1, 1, 5, 10] as const;
const QUICK_PCTS = [0, 25, 50, 75, 100] as const;

export default function AdminSignalsPage() {
  const [tab, setTab] = useState<TabId>("allocation");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [signals, setSignals] = useState<TradingSignalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [draftPct, setDraftPct] = useState<Record<string, string>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [grantUserId, setGrantUserId] = useState("");
  const [bulkNote, setBulkNote] = useState("Platform signal adjustment");
  const [grantDays, setGrantDays] = useState("30");
  const [grantTier, setGrantTier] = useState("starter");

  const [symbol, setSymbol] = useState("BTC/USD");
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [entry, setEntry] = useState("");
  const [target, setTarget] = useState("");
  const [stop, setStop] = useState("");
  const [minTier, setMinTier] = useState("starter");
  const [confidence, setConfidence] = useState("75");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const [usersRes, signalsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, signal_pct, role")
        .neq("role", "admin")
        .order("email")
        .limit(300),
      supabase
        .from("trading_signals")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(40),
    ]);
    if (usersRes.error) setError(usersRes.error.message);
    else {
      const rows = (usersRes.data as UserRow[]) ?? [];
      setUsers(rows);
      setDraftPct(
        Object.fromEntries(rows.map((u) => [u.id, String(u.signal_pct ?? 0)]))
      );
    }
    if (signalsRes.error) setError(signalsRes.error.message);
    else setSignals((signalsRes.data as TradingSignalRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const total = users.length;
    const avg = total ? users.reduce((s, u) => s + (u.signal_pct ?? 0), 0) / total : 0;
    const atZero = users.filter((u) => (u.signal_pct ?? 0) <= 0).length;
    const activeDesk = signals.filter((s) => s.status === "active").length;
    return { total, avg, atZero, activeDesk };
  }, [users, signals]);

  function setDraftForUser(userId: string, pct: string) {
    setDraftPct((prev) => ({ ...prev, [userId]: pct }));
  }

  function flash(msg: string) {
    setSuccess(msg);
    setError("");
  }

  async function runBulk(delta: number) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const data = await bulkAdjustAdminSignalPct({ delta, note: bulkNote });
      flash(`Adjusted ${data.users_updated ?? 0} users by ${delta > 0 ? "+" : ""}${delta}%.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk adjust failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveUserPct(user: UserRow) {
    const pct = parseFloat(draftPct[user.id] ?? "0");
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setError("Enter a percentage between 0 and 100.");
      return;
    }
    setSavingUserId(user.id);
    setError("");
    setSuccess("");
    try {
      await setAdminUserSignalPct({ userId: user.id, pct });
      flash(`Set ${user.email} to ${pct}%.`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, signal_pct: pct } : u))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update user.");
    } finally {
      setSavingUserId(null);
    }
  }

  async function grantPackage() {
    if (!grantUserId) {
      setError("Select a user for package access.");
      return;
    }
    const user = users.find((u) => u.id === grantUserId);
    const plan = SIGNAL_PLANS.find((p) => p.id === grantTier);
    if (!plan) return;
    const days = parseInt(grantDays, 10);
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await grantAdminUserSignal({
        userId: grantUserId,
        packageId: plan.id,
        packageName: plan.name,
        durationDays: Number.isFinite(days) ? days : 30,
      });
      flash(`Granted ${plan.name} to ${user?.email ?? "user"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Grant failed.");
    } finally {
      setBusy(false);
    }
  }

  async function publishSignal() {
    if (!entry.trim() || !target.trim() || !stop.trim()) {
      setError("Entry, target, and stop are required.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const supabase = createClient();
      const { error: insertErr } = await supabase.from("trading_signals").insert({
        symbol: symbol.trim(),
        direction,
        entry_price: entry.trim(),
        target_price: target.trim(),
        stop_price: stop.trim(),
        min_tier: minTier,
        confidence: Math.min(100, Math.max(0, parseInt(confidence, 10) || 70)),
        notes: notes.trim() || null,
        status: "active",
      });
      if (insertErr) throw insertErr;
      flash("Signal published to the desk.");
      setEntry("");
      setTarget("");
      setStop("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish signal.");
    } finally {
      setBusy(false);
    }
  }

  async function closeSignal(id: string) {
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: updErr } = await supabase
        .from("trading_signals")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("id", id);
      if (updErr) throw updErr;
      flash("Signal closed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not close signal.");
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: TabId; label: string; hint: string }[] = [
    { id: "allocation", label: "User allocation", hint: "Set signal % shown on user dashboard" },
    { id: "desk", label: "Trading desk", hint: "Publish and manage desk signals" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <AdminPageHeader
        title="Signals"
        subtitle="Control the signal strength users see on their overview dashboard."
        action={
          <Button variant="outline" size="sm" onClick={load} disabled={loading || busy}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {(error || success) && (
        <p
          role={error ? "alert" : "status"}
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            error
              ? "border-red/30 bg-red/10 text-red"
              : "border-green/30 bg-green/10 text-green"
          )}
        >
          {error || success}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Users", value: stats.total.toLocaleString() },
          { label: "Avg signal", value: formatPercent(stats.avg) },
          { label: "At 0%", value: stats.atZero.toLocaleString() },
          { label: "Active desk", value: stats.activeDesk.toLocaleString() },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
              {item.label}
            </p>
            <p className="mt-1 text-xl font-bold text-text-primary">{item.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="scroll-tabs max-w-full overflow-x-auto pb-1">
          <div className="inline-flex rounded-xl border border-border bg-bg-secondary p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  tab === t.id
                    ? "bg-bg-primary text-text-primary shadow-sm"
                    : "text-text-tertiary hover:text-text-primary"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-text-tertiary">{tabs.find((t) => t.id === tab)?.hint}</p>
      </div>

      {tab === "allocation" && (
        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Bulk adjust everyone</h2>
                <p className="mt-1 text-xs text-text-tertiary">
                  Shift all non-admin users up or down (clamped 0–100%).
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {BULK_STEPS.map((step) => (
                  <Button
                    key={step}
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => runBulk(step)}
                  >
                    {step > 0 && <Plus className="mr-1 h-3 w-3" />}
                    {step > 0 ? "+" : ""}
                    {step}%
                  </Button>
                ))}
              </div>
            </div>
            <div className="mt-4 max-w-md">
              <Input
                label="Bulk note"
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                placeholder="Reason for team audit"
              />
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">All users</h2>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Set signal % for each user — no search needed.
                </p>
              </div>
              <p className="text-xs text-text-tertiary">{users.length} users</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
              </div>
            ) : users.length === 0 ? (
              <p className="py-16 text-center text-sm text-text-tertiary">No users found.</p>
            ) : (
              <>
                <div className="divide-y divide-border lg:hidden">
                  {users.map((u) => {
                    const strength = getSignalStrength(u.signal_pct ?? 0);
                    const draft = draftPct[u.id] ?? String(u.signal_pct ?? 0);
                    const draftStrength = getSignalStrength(parseFloat(draft) || 0);
                    const isDirty = draft !== String(u.signal_pct ?? 0);
                    const saving = savingUserId === u.id;

                    return (
                      <div key={u.id} className="space-y-3 p-4">
                        <div>
                          <p className="font-medium text-text-primary">{u.full_name || u.email}</p>
                          <p className="text-xs text-text-tertiary">{u.email}</p>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Current</p>
                            <p className="font-bold" style={{ color: strength.color }}>
                              {formatPercent(u.signal_pct ?? 0)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Draft</p>
                            <p className="text-sm font-medium" style={{ color: draftStrength.color }}>
                              {draftStrength.label}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={draft}
                            onChange={(e) => setDraftForUser(u.id, e.target.value)}
                            className="h-10 w-24 rounded-lg border border-border bg-bg-primary px-2 font-mono outline-none focus:border-brand"
                          />
                          <div className="flex flex-1 flex-wrap gap-1">
                            {QUICK_PCTS.map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => setDraftForUser(u.id, String(pct))}
                                className={cn(
                                  "rounded border px-2 py-1 text-[11px] font-medium transition-colors",
                                  draft === String(pct)
                                    ? "border-brand bg-brand/10 text-text-primary"
                                    : "border-border text-text-tertiary"
                                )}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </div>
                        <Button
                          className="w-full"
                          size="sm"
                          variant={isDirty ? "brand" : "outline"}
                          disabled={saving || busy}
                          onClick={() => void saveUserPct(u)}
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-secondary/60 text-[11px] uppercase tracking-wide text-text-tertiary">
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Current</th>
                      <th className="px-4 py-3 font-medium">New %</th>
                      <th className="px-4 py-3 font-medium">Quick set</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((u) => {
                      const strength = getSignalStrength(u.signal_pct ?? 0);
                      const draft = draftPct[u.id] ?? String(u.signal_pct ?? 0);
                      const draftStrength = getSignalStrength(parseFloat(draft) || 0);
                      const isDirty = draft !== String(u.signal_pct ?? 0);
                      const saving = savingUserId === u.id;

                      return (
                        <tr key={u.id} className="hover:bg-bg-hover/40">
                          <td className="px-4 py-3">
                            <p className="font-medium text-text-primary truncate max-w-[200px]">
                              {u.full_name || u.email}
                            </p>
                            <p className="text-xs text-text-tertiary truncate max-w-[220px]">{u.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold" style={{ color: strength.color }}>
                              {formatPercent(u.signal_pct ?? 0)}
                            </p>
                            <p className="text-[10px] text-text-tertiary">{strength.label}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={draft}
                                onChange={(e) => setDraftForUser(u.id, e.target.value)}
                                className="h-9 w-20 rounded-lg border border-border bg-bg-primary px-2 text-sm font-mono outline-none focus:border-brand"
                              />
                              <span
                                className="hidden sm:inline text-xs font-medium"
                                style={{ color: draftStrength.color }}
                              >
                                {draftStrength.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {QUICK_PCTS.map((pct) => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => setDraftForUser(u.id, String(pct))}
                                  className={cn(
                                    "rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                                    draft === String(pct)
                                      ? "border-brand bg-brand/10 text-text-primary"
                                      : "border-border text-text-tertiary hover:bg-bg-hover"
                                  )}
                                >
                                  {pct}%
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant={isDirty ? "brand" : "outline"}
                              disabled={saving || busy}
                              onClick={() => void saveUserPct(u)}
                            >
                              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {tab === "desk" && (
        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-text-primary">Publish new signal</h2>
            <p className="mt-1 text-xs text-text-tertiary">
              Optional desk feed for subscribed users. Most teams only need user allocation above.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
              <label className="block text-xs text-text-tertiary">
                Direction
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-primary px-3 text-sm"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as "buy" | "sell")}
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </label>
              <Input label="Entry" value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="67250" />
              <Input label="Target" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="68500" />
              <Input label="Stop" value={stop} onChange={(e) => setStop(e.target.value)} placeholder="66500" />
              <label className="block text-xs text-text-tertiary">
                Min tier
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-primary px-3 text-sm"
                  value={minTier}
                  onChange={(e) => setMinTier(e.target.value)}
                >
                  {SIGNAL_PLANS.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                  <option value="basic">Basic (legacy)</option>
                  <option value="pro">Pro (legacy)</option>
                  <option value="vip">VIP (legacy)</option>
                </select>
              </label>
              <Input
                label="Confidence %"
                type="number"
                min={0}
                max={100}
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
              />
            </div>
            <div className="mt-3">
              <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button className="mt-4" disabled={busy} onClick={publishSignal}>
              Publish signal
            </Button>
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-text-primary">Grant package access</h2>
            <p className="mt-1 text-xs text-text-tertiary">
              Give a user free desk tier access for a limited time.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-xs text-text-tertiary sm:col-span-2">
                User
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-primary px-3 text-sm"
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                >
                  <option value="">Select user…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-text-tertiary">
                Tier
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-primary px-3 text-sm"
                  value={grantTier}
                  onChange={(e) => setGrantTier(e.target.value)}
                >
                  {SIGNAL_PLANS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Days"
                type="number"
                min={1}
                value={grantDays}
                onChange={(e) => setGrantDays(e.target.value)}
              />
            </div>
            <Button className="mt-4" variant="outline" disabled={busy || !grantUserId} onClick={grantPackage}>
              Grant access
            </Button>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-text-primary">Recent desk signals</h2>
            </div>
            {signals.length === 0 ? (
              <p className="py-10 text-center text-sm text-text-tertiary">No signals published yet.</p>
            ) : (
              <>
                <div className="divide-y divide-border lg:hidden">
                  {signals.map((signal) => (
                    <div key={signal.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-text-primary">{signal.symbol}</p>
                          <p className="mt-1 text-xs text-text-secondary">
                            <span className={signal.direction === "buy" ? "text-green" : "text-red"}>
                              {signal.direction.toUpperCase()}
                            </span>
                            {" · E "}
                            {signal.entry_price} · TP {signal.target_price} · SL {signal.stop_price}
                          </p>
                        </div>
                        <StatusBadge status={signal.status} />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-tertiary">
                        <span>{signalTierLabel(signal.min_tier)}</span>
                        <span>{formatDate(signal.published_at)}</span>
                      </div>
                      {signal.status === "active" && (
                        <Button
                          className="w-full"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => closeSignal(signal.id)}
                        >
                          Close
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-secondary/60 text-[11px] uppercase tracking-wide text-text-tertiary">
                      <th className="px-4 py-3 font-medium">Pair</th>
                      <th className="px-4 py-3 font-medium">Setup</th>
                      <th className="px-4 py-3 font-medium">Tier</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Published</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {signals.map((signal) => (
                      <tr key={signal.id} className="hover:bg-bg-hover/50">
                        <td className="px-4 py-3 font-semibold text-text-primary">{signal.symbol}</td>
                        <td className="px-4 py-3 text-xs text-text-secondary">
                          <span className={signal.direction === "buy" ? "text-green" : "text-red"}>
                            {signal.direction.toUpperCase()}
                          </span>
                          {" · E "}
                          {signal.entry_price} · TP {signal.target_price} · SL {signal.stop_price}
                        </td>
                        <td className="px-4 py-3 text-xs text-text-tertiary">
                          {signalTierLabel(signal.min_tier)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={signal.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-text-tertiary">
                          {formatDate(signal.published_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {signal.status === "active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() => closeSignal(signal.id)}
                            >
                              Close
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
