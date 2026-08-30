"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { completeWithdrawal, rejectWithdrawal } from "@/lib/admin-api";
import type { WithdrawalRow } from "@/lib/admin-types";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminFilterBar, AdminListActions } from "@/components/admin/AdminFilterBar";
import { StatusBadge, isPending } from "@/components/admin/StatusBadge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { formatWithdrawalMethodLabel, formatWithdrawalSummary } from "@/lib/withdrawal-options";
import { AdminWithdrawalRejectDialog } from "@/components/admin/AdminWithdrawalRejectDialog";
import { RefreshCw } from "@/components/icons";

type Filter = "all" | "pending" | "completed" | "rejected";

export default function AdminWithdrawalsPage() {
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [acting, setActing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [rejecting, setRejecting] = useState<WithdrawalRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("withdrawals")
      .select("*, profiles(email, full_name)")
      .order("created_at", { ascending: false });
    setRows((data as WithdrawalRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleComplete(id: string) {
    setActing(id);
    setMessage("");
    try {
      await completeWithdrawal(id);
      setMessage("Withdrawal marked complete");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed");
    }
    setActing(null);
  }

  async function handleReject(reason: string) {
    if (!rejecting) return;
    setActing(rejecting.id);
    setMessage("");
    try {
      await rejectWithdrawal(rejecting.id, reason);
      setMessage("Withdrawal rejected");
      setRejecting(null);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed");
    }
    setActing(null);
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "completed", label: "Completed" },
    { key: "rejected", label: "Rejected" },
  ];

  const filtered = rows.filter((w) => {
    if (filter === "pending") return w.status === "pending";
    if (filter === "completed") return w.status === "completed";
    if (filter === "rejected") return w.status === "rejected";
    return true;
  });

  const pendingCount = rows.filter((w) => w.status === "pending").length;

  return (
    <div className="space-y-5 max-w-5xl">
      <AdminPageHeader
        title="Withdrawals"
        subtitle="Process pending withdrawal requests."
        notificationCount={pendingCount}
        action={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {message && (
        <p className="text-sm text-text-secondary border border-border rounded-lg px-4 py-3 bg-bg-secondary">
          {message}
        </p>
      )}

      <AdminFilterBar value={filter} onChange={setFilter} options={filters.map((f) => ({ key: f.key, label: f.label }))} />

      <Card className="overflow-hidden p-0">
        {loading ? (
          <p className="p-8 text-center text-sm text-text-tertiary">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-text-tertiary">No withdrawals found.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((w) => {
              const userLabel = w.profiles?.full_name || w.profiles?.email || w.user_id.slice(0, 8);
              const pending = isPending(w.status);
              return (
                <li key={w.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-text-primary">{formatCurrency(w.amount)}</span>
                      <StatusBadge status={w.status} />
                    </div>
                    <p className="text-sm text-text-tertiary mt-1">
                      {userLabel} · {formatWithdrawalMethodLabel(w.method)} · {formatDate(w.created_at)}
                    </p>
                    {formatWithdrawalSummary(w).map((line) => (
                      <p key={line} className="text-xs text-text-tertiary mt-1 font-mono break-all">
                        {line}
                      </p>
                    ))}
                    {w.status === "rejected" && w.rejection_reason && (
                      <p className="mt-2 text-xs leading-relaxed text-red">
                        Reason: {w.rejection_reason}
                      </p>
                    )}
                  </div>
                  {pending && (
                    <AdminListActions>
                      <Button size="sm" disabled={acting === w.id} onClick={() => handleComplete(w.id)}>
                        Complete
                      </Button>
                      <Button size="sm" variant="outline" disabled={acting === w.id} onClick={() => setRejecting(w)}>
                        Reject
                      </Button>
                    </AdminListActions>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <AdminWithdrawalRejectDialog
        open={!!rejecting}
        amount={rejecting?.amount ?? 0}
        userLabel={
          rejecting?.profiles?.full_name || rejecting?.profiles?.email || rejecting?.user_id.slice(0, 8) || ""
        }
        busy={acting === rejecting?.id}
        onClose={() => {
          if (!acting) setRejecting(null);
        }}
        onConfirm={(reason) => void handleReject(reason)}
      />
    </div>
  );
}
