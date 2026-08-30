"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { approveDeposit, rejectDeposit } from "@/lib/admin-api";
import type { DepositRow } from "@/lib/admin-types";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminFilterBar, AdminListActions } from "@/components/admin/AdminFilterBar";
import { AdminDepositDetailPanel } from "@/components/admin/AdminDepositDetailPanel";
import { AdminDepositRejectDialog } from "@/components/admin/AdminDepositRejectDialog";
import { AdminMobilePanel } from "@/components/admin/AdminMobilePanel";
import { StatusBadge, isPending } from "@/components/admin/StatusBadge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDepositMethod } from "@/lib/deposit-options";
import { isSpotWalletDepositNotes } from "@/lib/spot-wallet-deposits";
import { parseDepositNotes } from "@/lib/deposit-details";
import { RefreshCw } from "@/components/icons";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

type Filter = "all" | "pending" | "completed" | "rejected";

type AdminDepositsWorkspaceProps = {
  title: string;
  subtitle: string;
  variant: "crypto" | "other";
  emptyMessage?: string;
};

function matchesVariant(deposit: DepositRow, variant: "crypto" | "other") {
  const spotWallet = isSpotWalletDepositNotes(deposit.notes);
  return variant === "crypto" ? spotWallet : !spotWallet;
}

export function AdminDepositsWorkspace({
  title,
  subtitle,
  variant,
  emptyMessage = "No deposits found.",
}: AdminDepositsWorkspaceProps) {
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [acting, setActing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<DepositRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("deposits")
      .select("*, profiles(email, full_name)")
      .order("created_at", { ascending: false });
    if (!error) {
      const rows = ((data as DepositRow[]) ?? []).filter((d) => matchesVariant(d, variant));
      setDeposits(rows);
    }
    setLoading(false);
  }, [variant]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = deposits.find((d) => d.id === selectedId) ?? null;
  const showDetail = !!selected;

  function closeDetail() {
    setSelectedId(null);
  }

  async function handleApprove(d: DepositRow) {
    setActing(d.id);
    setMessage("");
    try {
      await approveDeposit(d.id, d.user_id, d.amount, d.method);
      setMessage(`Approved ${formatCurrency(d.amount)}`);
      closeDetail();
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
      await rejectDeposit(rejecting.id, reason);
      setMessage("Deposit rejected");
      setRejecting(null);
      closeDetail();
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed");
    }
    setActing(null);
  }

  const filtered = deposits.filter((d) => {
    if (filter === "pending") return d.status === "pending";
    if (filter === "completed") return d.status === "completed" || d.status === "approved";
    if (filter === "rejected") return d.status === "rejected";
    return true;
  });

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "completed", label: "Completed" },
    { key: "rejected", label: "Rejected" },
  ];

  function renderDetailActions(d: DepositRow) {
    if (!isPending(d.status)) return null;
    return (
      <>
        <Button size="sm" disabled={acting === d.id} onClick={() => handleApprove(d)}>
          Approve
        </Button>
        <Button size="sm" variant="outline" disabled={acting === d.id} onClick={() => setRejecting(d)}>
          Reject
        </Button>
      </>
    );
  }

  const pendingCount = deposits.filter((d) => d.status === "pending").length;

  return (
    <div className="space-y-5 max-w-5xl">
      <AdminPageHeader
        title={title}
        subtitle={subtitle}
        notificationCount={pendingCount}
        action={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {message && !showDetail && (
        <p className="text-sm text-text-secondary border border-border rounded-lg px-4 py-3 bg-bg-secondary">
          {message}
        </p>
      )}

      <AdminFilterBar value={filter} onChange={setFilter} options={filters.map((f) => ({ key: f.key, label: f.label }))} />

      <div className={cn("grid gap-4", showDetail && "lg:grid-cols-2")}>
        <Card className="overflow-hidden p-0">
          {loading ? (
            <p className="p-8 text-center text-sm text-text-tertiary">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-text-tertiary">{emptyMessage}</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((d) => {
                const userLabel = d.profiles?.full_name || d.profiles?.email || d.user_id.slice(0, 8);
                const pending = isPending(d.status);
                const parsedNotes = parseDepositNotes(d.notes ?? null, d.method);
                const hasImages =
                  parsedNotes.type === "gift_card" &&
                  Boolean(parsedNotes.frontImageUrl || parsedNotes.backImageUrl);

                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(d.id)}
                      className={cn(
                        "w-full p-4 text-left transition-colors hover:bg-bg-hover",
                        selectedId === d.id && "bg-brand/5"
                      )}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-text-primary">{formatCurrency(d.amount)}</span>
                            <StatusBadge status={d.status} />
                            {hasImages && (
                              <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand">
                                Has images
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-text-tertiary mt-1">
                            {userLabel} · {formatDepositMethod(d.method)} · {formatDate(d.created_at)}
                          </p>
                          {d.status === "rejected" && d.rejection_reason && (
                            <p className="mt-1 text-xs text-red line-clamp-2">
                              Reason: {d.rejection_reason}
                            </p>
                          )}
                          {parsedNotes.type === "gift_card" && parsedNotes.cardCode && (
                            <p className="text-xs text-text-secondary mt-1 font-mono truncate">
                              Code: {parsedNotes.cardCode}
                            </p>
                          )}
                        </div>
                        {pending && (
                          <AdminListActions>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(d.id);
                              }}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              disabled={acting === d.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleApprove(d);
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={acting === d.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setRejecting(d);
                              }}
                            >
                              Reject
                            </Button>
                          </AdminListActions>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {selected && (
          <div className="hidden lg:block">
            {message && (
              <p className="mb-4 text-sm text-text-secondary border border-border rounded-lg px-4 py-3 bg-bg-secondary">
                {message}
              </p>
            )}
            <AdminDepositDetailPanel
              deposit={selected}
              onClose={closeDetail}
              actions={renderDetailActions(selected)}
            />
          </div>
        )}
      </div>

      <AdminMobilePanel
        open={showDetail}
        title={selected ? formatDepositMethod(selected.method) : title}
        subtitle={selected ? formatCurrency(selected.amount) : undefined}
        onClose={closeDetail}
      >
        {message && (
          <p className="mb-4 text-sm text-text-secondary border border-border rounded-lg px-4 py-3 bg-bg-secondary">
            {message}
          </p>
        )}
        {selected && (
          <AdminDepositDetailPanel
            deposit={selected}
            onClose={closeDetail}
            actions={renderDetailActions(selected)}
          />
        )}
      </AdminMobilePanel>

      <AdminDepositRejectDialog
        open={!!rejecting}
        amount={rejecting?.amount ?? 0}
        userLabel={
          rejecting?.profiles?.full_name || rejecting?.profiles?.email || rejecting?.user_id.slice(0, 8) || "User"
        }
        busy={acting === rejecting?.id}
        onClose={() => setRejecting(null)}
        onConfirm={handleReject}
      />
    </div>
  );
}
