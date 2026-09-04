"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import {
  fetchAdminUserDetails,
  moderateAdminUser,
  adjustAdminUserBalance,
  adjustAdminUserProfit,
  assignAdminUserFee,
  updateAdminUserFeeStatus,
  deleteAdminUser,
  generateWithdrawalCode,
  setAdminUserWithdrawalCode,
} from "@/lib/admin-api";
import type { AdminUserFee, Profile } from "@/lib/admin-types";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminMobilePanel } from "@/components/admin/AdminMobilePanel";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { formatProfileLocation } from "@/lib/user-location";
import { Globe, MapPin, RefreshCw, Search, X } from "@/components/icons";

const FEE_TYPES = [
  { id: "withdrawal_processing", label: "Withdrawal processing fee" },
  { id: "kyc_aml", label: "KYC / AML verification fee" },
  { id: "wallet_activation", label: "Wallet activation fee" },
  { id: "custom", label: "Custom fee" },
] as const;

function hasLocationData(profile: Profile): boolean {
  return Boolean(
    profile.last_known_location ||
      profile.last_known_ip ||
      profile.country ||
      profile.city ||
      profile.timezone
  );
}

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Awaited<ReturnType<typeof fetchAdminUserDetails>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceReason, setBalanceReason] = useState("");
  const [profitAmount, setProfitAmount] = useState("");
  const [profitNote, setProfitNote] = useState("");
  const [feeType, setFeeType] = useState<string>(FEE_TYPES[0].id);
  const [feeLabel, setFeeLabel] = useState<string>(FEE_TYPES[0].label);
  const [feeAmount, setFeeAmount] = useState("");
  const [feeNotes, setFeeNotes] = useState("");
  const [moderationReason, setModerationReason] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [withdrawalCodeDraft, setWithdrawalCodeDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers((data as Profile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const location = formatProfileLocation(u).toLowerCase();
      return (
        u.email.toLowerCase().includes(q) ||
        (u.full_name?.toLowerCase().includes(q) ?? false) ||
        u.role.includes(q) ||
        u.kyc_status.includes(q) ||
        (u.is_suspended && "suspended".includes(q)) ||
        (u.country?.toLowerCase().includes(q) ?? false) ||
        (u.city?.toLowerCase().includes(q) ?? false) ||
        (u.last_known_ip?.toLowerCase().includes(q) ?? false) ||
        (location !== "—" && location.includes(q))
      );
    });
  }, [users, search]);

  function showFeedback(text: string, tone: "success" | "error" = "success") {
    setMessage(text);
    setMessageTone(tone);
  }

  async function openUser(id: string, options?: { keepMessage?: boolean }) {
    setSelectedId(id);
    setDetailLoading(true);
    if (!options?.keepMessage) setMessage("");
    setDeleteConfirm(false);
    setDeleteReason("");
    try {
      const d = await fetchAdminUserDetails(id);
      setDetails(d);
      setWithdrawalCodeDraft(d.profile.withdrawal_code ?? "");
    } catch (e) {
      showFeedback(e instanceof Error ? e.message : "Could not load user", "error");
      setDetails(null);
    }
    setDetailLoading(false);
  }

  async function handleModerate(action: "suspend" | "unsuspend" | "reset_kyc") {
    if (!selectedId) return;
    const reason = moderationReason.trim();
    if (action !== "unsuspend" && reason.length < 3) {
      showFeedback(t("admin.userDetail.reasonRequired"), "error");
      return;
    }
    setActing(true);
    try {
      await moderateAdminUser({
        userId: selectedId,
        action,
        reason:
          action === "suspend"
            ? reason
            : action === "reset_kyc"
              ? reason
              : reason || "Suspension lifted by team",
      });
      showFeedback(
        action === "suspend"
          ? "User suspended"
          : action === "reset_kyc"
            ? "KYC reset — user must verify again"
            : "User unsuspended"
      );
      setModerationReason("");
      await openUser(selectedId);
      await load();
    } catch (e) {
      showFeedback(e instanceof Error ? e.message : "Action failed", "error");
    }
    setActing(false);
  }

  async function handleProfit(mode: "profit" | "loss") {
    if (!selectedId || !profitAmount) return;
    const raw = Math.abs(parseFloat(profitAmount));
    if (!Number.isFinite(raw) || raw <= 0) {
      showFeedback("Enter a valid profit or loss amount.", "error");
      return;
    }
    setActing(true);
    try {
      const result = await adjustAdminUserProfit({
        userId: selectedId,
        amount: mode === "profit" ? raw : -raw,
        note: profitNote.trim() || undefined,
      });
      const total = Number(result.profit_total ?? 0);
      showFeedback(
        `${mode === "profit" ? "Profit" : "Loss"} applied. Profit Total is now ${formatCurrency(total)}.`
      );
      setProfitAmount("");
      setProfitNote("");
      await openUser(selectedId, { keepMessage: true });
      await load();
    } catch (e) {
      showFeedback(e instanceof Error ? e.message : "Profit adjustment failed", "error");
    }
    setActing(false);
  }

  async function handleWithdrawalCode(nextCode: string | null) {
    if (!selectedId) return;
    setActing(true);
    try {
      const result = await setAdminUserWithdrawalCode({
        userId: selectedId,
        code: nextCode,
      });
      const saved = result.withdrawal_code ?? "";
      setWithdrawalCodeDraft(saved);
      showFeedback(
        saved
          ? `Withdrawal code assigned: ${saved}. Share it with the user through support.`
          : "Withdrawal code removed."
      );
      await openUser(selectedId, { keepMessage: true });
    } catch (e) {
      showFeedback(e instanceof Error ? e.message : "Could not update withdrawal code.", "error");
    }
    setActing(false);
  }

  async function handleBalance(direction: "credit" | "debit") {
    if (!selectedId) return;

    const amount = parseFloat(balanceAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showFeedback("Enter a valid amount greater than zero.", "error");
      return;
    }

    const reason = balanceReason.trim() || "Admin balance adjustment";
    if (reason.length < 3) {
      showFeedback("Enter a reason of at least 3 characters.", "error");
      return;
    }

    setActing(true);
    try {
      const result = await adjustAdminUserBalance({
        userId: selectedId,
        direction,
        amount,
        reason,
      });
      const after = Number(result.balance_after ?? details?.balance ?? 0);
      showFeedback(
        `Balance ${direction === "credit" ? "credited" : "debited"} ${formatCurrency(amount)}. New balance: ${formatCurrency(after)}.`
      );
      setBalanceAmount("");
      setBalanceReason("");
      await openUser(selectedId, { keepMessage: true });
      await load();
    } catch (e) {
      showFeedback(e instanceof Error ? e.message : "Balance adjustment failed", "error");
    }
    setActing(false);
  }

  function handleFeeTypeChange(nextType: string) {
    setFeeType(nextType);
    const preset = FEE_TYPES.find((t) => t.id === nextType);
    if (preset && nextType !== "custom") {
      setFeeLabel(preset.label);
    } else if (nextType === "custom") {
      setFeeLabel("");
    }
  }

  async function handleAssignFee() {
    if (!selectedId) return;
    const amount = parseFloat(feeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showFeedback("Enter a valid fee amount greater than zero.", "error");
      return;
    }
    if (!feeLabel.trim()) {
      showFeedback("Fee label is required.", "error");
      return;
    }
    setActing(true);
    try {
      await assignAdminUserFee({
        userId: selectedId,
        feeType,
        label: feeLabel.trim(),
        amount,
        notes: feeNotes.trim() || undefined,
      });
      showFeedback(`Withdrawal fee of ${formatCurrency(amount)} assigned. User must deposit to pay it.`);
      setFeeAmount("");
      setFeeNotes("");
      await openUser(selectedId);
    } catch (e) {
      showFeedback(e instanceof Error ? e.message : "Could not assign fee", "error");
    }
    setActing(false);
  }

  async function handleFeeStatus(feeId: string, status: "paid" | "waived" | "cancelled") {
    if (!selectedId) return;
    setActing(true);
    try {
      await updateAdminUserFeeStatus({ feeId, status });
      showFeedback(`Fee marked as ${status}.`);
      await openUser(selectedId);
    } catch (e) {
      showFeedback(e instanceof Error ? e.message : "Could not update fee", "error");
    }
    setActing(false);
  }

  async function handleDeleteUser() {
    if (!selectedId || !details) return;
    const reason = deleteReason.trim() || moderationReason.trim();
    if (reason.length < 3) {
      showFeedback(t("admin.userDetail.reasonRequired"), "error");
      return;
    }
    setActing(true);
    try {
      await deleteAdminUser({ userId: selectedId, reason });
      showFeedback(`Deleted ${details.profile.email}`);
      closeUser();
      await load();
    } catch (e) {
      showFeedback(e instanceof Error ? e.message : t("admin.userDetail.deleteFailed"), "error");
    }
    setActing(false);
    setDeleteConfirm(false);
  }

  function closeUser() {
    setSelectedId(null);
    setDetails(null);
    setMessage("");
  }

  const showDetail = !!selectedId;
  const detailTitle =
    details?.profile.full_name || details?.profile.email || t("admin.userDetail.title");

  function renderUserList(searchHeader: React.ReactNode) {
    return (
      <>
        {searchHeader}
        {loading ? (
          <p className="p-8 text-center text-sm text-text-tertiary">Loading…</p>
        ) : filteredUsers.length === 0 ? (
          <p className="p-8 text-center text-sm text-text-tertiary">{t("admin.noUsers")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {filteredUsers.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => openUser(u.id)}
                  className={cn(
                    "w-full text-left p-4 hover:bg-bg-hover transition-colors active:bg-bg-hover",
                    selectedId === u.id && "bg-brand/5"
                  )}
                >
                  <p className="font-medium text-text-primary truncate">{u.full_name || u.email}</p>
                  <p className="text-xs text-text-tertiary truncate">{u.email}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
                    <MapPin className="h-3 w-3 shrink-0 text-text-tertiary" />
                    <span className="truncate">{formatProfileLocation(u)}</span>
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <StatusBadge status={u.kyc_status} />
                    {u.role === "admin" && <StatusBadge status="team" />}
                    {u.is_suspended && <StatusBadge status="suspended" />}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  function renderFeedback() {
    if (!message) return null;
    return (
      <p
        className={cn(
          "rounded-lg border px-4 py-3 text-sm",
          messageTone === "error"
            ? "border-red/30 bg-red/5 text-red"
            : "border-green/30 bg-green/5 text-green"
        )}
      >
        {message}
      </p>
    );
  }

  function renderUserDetails(options?: { hideHeader?: boolean }) {
    if (!selectedId) return null;
    if (detailLoading) {
      return <p className="text-sm text-text-tertiary py-8 text-center">Loading user…</p>;
    }
    if (!details) return null;

    return (
      <div className="space-y-4">
              {renderFeedback()}
              {!options?.hideHeader && (
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{details.profile.full_name || details.profile.email}</h2>
                <p className="text-sm text-text-tertiary">{details.profile.email}</p>
                <p className="text-xs text-text-tertiary mt-1">Joined {formatDate(details.profile.created_at)}</p>
              </div>
              )}

              <div className="rounded-lg border border-border bg-bg-secondary/40 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <Globe className="h-4 w-4 text-green" />
                    {t("admin.userDetail.location")}
                  </h3>
                  {hasLocationData(details.profile) && (
                    <span className="rounded-full border border-green/30 bg-green/10 px-2 py-0.5 text-[10px] font-semibold text-green">
                      {t("admin.userDetail.locationLive")}
                    </span>
                  )}
                </div>

                {hasLocationData(details.profile) ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-green/20 bg-green/[0.06] px-3 py-2.5">
                      <p className="text-sm font-medium text-text-primary">
                        {formatProfileLocation(details.profile)}
                      </p>
                      {details.profile.location_updated_at && (
                        <p className="mt-1 text-xs text-text-tertiary">
                          {t("admin.userDetail.locationDetectedAt", {
                            time: formatDate(details.profile.location_updated_at),
                          })}
                        </p>
                      )}
                    </div>
                    <dl className="grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-text-tertiary">
                          {t("admin.userDetail.country")}
                        </dt>
                        <dd className="mt-0.5 text-text-primary">{details.profile.country || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-text-tertiary">
                          {t("admin.userDetail.city")}
                        </dt>
                        <dd className="mt-0.5 text-text-primary">{details.profile.city || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-text-tertiary">
                          {t("admin.userDetail.region")}
                        </dt>
                        <dd className="mt-0.5 text-text-primary">{details.profile.region || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-text-tertiary">
                          {t("admin.userDetail.timezone")}
                        </dt>
                        <dd className="mt-0.5 text-text-primary">{details.profile.timezone || "—"}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-[11px] uppercase tracking-wide text-text-tertiary">
                          {t("admin.userDetail.lastKnownIp")}
                        </dt>
                        <dd className="mt-0.5 font-mono text-xs text-text-primary break-all">
                          {details.profile.last_known_ip || "—"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <p className="rounded-lg border border-brand/20 bg-brand/5 px-3 py-2.5 text-sm text-text-secondary">
                    {t("admin.userDetail.locationPending")}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[11px] text-text-tertiary uppercase">Balance</p>
                  <p className="text-lg font-bold text-text-primary">{formatCurrency(details.balance)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[11px] text-text-tertiary uppercase">Profit Total</p>
                  <p
                    className={cn(
                      "text-lg font-bold",
                      (details.profit_total ?? 0) >= 0 ? "text-green" : "text-red"
                    )}
                  >
                    {formatCurrency(details.profit_total ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3 col-span-2 sm:col-span-1">
                  <p className="text-[11px] text-text-tertiary uppercase">Trades</p>
                  <p className="text-lg font-bold text-text-primary">{details.stats.trades_count}</p>
                </div>
                {(details.outstanding_fees_total ?? 0) > 0 && (
                  <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 col-span-2">
                    <p className="text-[11px] text-text-tertiary uppercase">Outstanding fees</p>
                    <p className="text-lg font-bold text-brand">
                      {formatCurrency(details.outstanding_fees_total)}
                    </p>
                    <p className="text-[11px] text-text-tertiary mt-1">
                      User must deposit to pay — not from balance.
                    </p>
                  </div>
                )}
              </div>

              {details.profile.is_suspended && (
                <div className="rounded-lg border border-red/25 bg-red/5 p-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status="suspended" />
                    {details.profile.suspended_at && (
                      <span className="text-xs text-text-tertiary">
                        {t("admin.userDetail.suspendedSince", {
                          date: formatDate(details.profile.suspended_at),
                        })}
                      </span>
                    )}
                  </div>
                  {details.profile.suspension_reason && (
                    <p className="mt-2 text-sm text-text-secondary">
                      <span className="font-medium text-text-primary">
                        {t("admin.userDetail.suspensionReason")}:
                      </span>{" "}
                      {details.profile.suspension_reason}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2 rounded-lg border border-border bg-bg-secondary/40 p-3">
                <p className="text-sm font-medium text-text-primary">
                  {t("admin.userDetail.accountActions")}
                </p>
                <p className="text-xs text-text-tertiary">{t("admin.userDetail.accountActionsDesc")}</p>
                <input
                  type="text"
                  placeholder={t("admin.userDetail.reasonPlaceholder")}
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  className="w-full h-10 px-3 bg-bg-primary border border-border rounded text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {details.profile.is_suspended ? (
                  <Button size="sm" variant="outline" disabled={acting} onClick={() => handleModerate("unsuspend")}>
                    Unsuspend
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled={acting} onClick={() => handleModerate("suspend")}>
                    Suspend
                  </Button>
                )}
                <Button size="sm" variant="outline" disabled={acting} onClick={() => handleModerate("reset_kyc")}>
                  Reset KYC
                </Button>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">Withdrawal code</p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    The user must enter this unique code to submit a payout. Share it through support.
                  </p>
                </div>
                <input
                  type="text"
                  value={withdrawalCodeDraft}
                  onChange={(e) => setWithdrawalCodeDraft(e.target.value.toUpperCase())}
                  placeholder="No code assigned"
                  className="w-full h-10 px-3 bg-bg-primary border border-border rounded text-sm font-mono tracking-wide"
                  autoComplete="off"
                  spellCheck={false}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={acting || !withdrawalCodeDraft.trim()}
                    onClick={() => void handleWithdrawalCode(withdrawalCodeDraft.trim())}
                  >
                    Save code
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={acting}
                    onClick={() => {
                      const generated = generateWithdrawalCode();
                      setWithdrawalCodeDraft(generated);
                      void handleWithdrawalCode(generated);
                    }}
                  >
                    Generate & assign
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={acting || !details.profile.withdrawal_code}
                    onClick={() => void handleWithdrawalCode(null)}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <p className="text-sm font-medium text-text-primary">Adjust profit / loss</p>
                <p className="text-xs text-text-tertiary">
                  Updates the user&apos;s Profit Total on the dashboard and credits or debits their balance.
                </p>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount (USD)"
                  value={profitAmount}
                  onChange={(e) => setProfitAmount(e.target.value)}
                  className="w-full h-10 px-3 bg-bg-primary border border-border rounded text-sm"
                />
                <input
                  type="text"
                  placeholder="Note (optional)"
                  value={profitNote}
                  onChange={(e) => setProfitNote(e.target.value)}
                  className="w-full h-10 px-3 bg-bg-primary border border-border rounded text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" disabled={acting} onClick={() => handleProfit("profit")}>
                    Add profit
                  </Button>
                  <Button size="sm" variant="outline" disabled={acting} onClick={() => handleProfit("loss")}>
                    Add loss
                  </Button>
                </div>
              </div>

              {(details.profit_adjustments?.length ?? 0) > 0 && (
                <div className="border-t border-border pt-4 space-y-2">
                  <p className="text-sm font-medium text-text-primary">Recent profit adjustments</p>
                  <ul className="max-h-40 space-y-2 overflow-y-auto text-xs">
                    {details.profit_adjustments?.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                      >
                        <span className={row.amount >= 0 ? "text-green font-semibold" : "text-red font-semibold"}>
                          {row.amount >= 0 ? "+" : ""}
                          {formatCurrency(row.amount)}
                        </span>
                        <span className="text-text-tertiary">{formatDate(row.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border-t border-border pt-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">Withdrawal fees</p>
                  <p className="text-xs text-text-tertiary mt-1">
                    Assign a fee the user must pay via a new deposit. Fees no longer block withdrawals.
                  </p>
                </div>

                {(details.fees?.length ?? 0) > 0 && (
                  <ul className="max-h-48 space-y-2 overflow-y-auto">
                    {details.fees?.map((fee: AdminUserFee) => (
                      <li
                        key={fee.id}
                        className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-text-primary">{fee.label}</p>
                            <StatusBadge status={fee.status} />
                          </div>
                          <p className="text-xs text-text-tertiary mt-0.5">
                            {formatCurrency(fee.amount)} · {formatDate(fee.created_at)}
                          </p>
                        </div>
                        {fee.status === "pending" && (
                          <div className="flex flex-wrap gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={acting}
                              onClick={() => handleFeeStatus(fee.id, "waived")}
                            >
                              Waive
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={acting}
                              onClick={() => handleFeeStatus(fee.id, "cancelled")}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              disabled={acting}
                              onClick={() => handleFeeStatus(fee.id, "paid")}
                            >
                              Mark paid
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block text-xs text-text-tertiary sm:col-span-2">
                    Fee type
                    <select
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-primary px-3 text-sm"
                      value={feeType}
                      onChange={(e) => handleFeeTypeChange(e.target.value)}
                    >
                      {FEE_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <input
                    type="text"
                    placeholder="Label shown to user"
                    value={feeLabel}
                    onChange={(e) => setFeeLabel(e.target.value)}
                    className="h-10 px-3 bg-bg-primary border border-border rounded text-sm sm:col-span-2"
                  />
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Amount (USD)"
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                    className="h-10 px-3 bg-bg-primary border border-border rounded text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Internal note (optional)"
                    value={feeNotes}
                    onChange={(e) => setFeeNotes(e.target.value)}
                    className="h-10 px-3 bg-bg-primary border border-border rounded text-sm"
                  />
                </div>
                <Button size="sm" disabled={acting} onClick={handleAssignFee}>
                  Assign withdrawal fee
                </Button>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">Adjust balance</p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Credit adds funds to the user&apos;s main cash balance. Debit removes funds.
                    Current balance: {formatCurrency(details.balance)}.
                  </p>
                </div>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Amount (USD)"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  className="w-full h-10 px-3 bg-bg-primary border border-border rounded text-sm"
                />
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  value={balanceReason}
                  onChange={(e) => setBalanceReason(e.target.value)}
                  className="w-full h-10 px-3 bg-bg-primary border border-border rounded text-sm"
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    size="sm"
                    disabled={acting}
                    onClick={() => void handleBalance("credit")}
                    className="sm:flex-1"
                  >
                    Credit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={acting}
                    onClick={() => void handleBalance("debit")}
                    className="sm:flex-1"
                  >
                    Debit
                  </Button>
                </div>
              </div>

              {(details.balance_adjustments?.length ?? 0) > 0 && (
                <div className="border-t border-border pt-4 space-y-2">
                  <p className="text-sm font-medium text-text-primary">Recent balance adjustments</p>
                  <ul className="max-h-40 space-y-2 overflow-y-auto text-xs">
                    {details.balance_adjustments?.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <span
                            className={
                              row.direction === "credit"
                                ? "text-green font-semibold"
                                : "text-red font-semibold"
                            }
                          >
                            {row.direction === "credit" ? "+" : "−"}
                            {formatCurrency(row.amount)}
                          </span>
                          {row.reason ? (
                            <p className="mt-0.5 truncate text-text-tertiary">{row.reason}</p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-text-tertiary">{formatDate(row.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {details.profile.role !== "admin" && (
                <div className="border-t border-border pt-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-red">{t("admin.userDetail.deleteUserTitle")}</p>
                    <p className="mt-1 text-xs text-text-tertiary">{t("admin.userDetail.deleteUserDesc")}</p>
                  </div>
                  {!deleteConfirm ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={acting}
                      className="border-red/30 text-red hover:bg-red/5"
                      onClick={() => setDeleteConfirm(true)}
                    >
                      <X className="h-3.5 w-3.5" />
                      {t("admin.userDetail.deleteUser")}
                    </Button>
                  ) : (
                    <div className="space-y-3 rounded-lg border border-red/25 bg-red/5 p-3">
                      <p className="text-sm text-text-primary">
                        {t("admin.userDetail.deleteConfirmBody", {
                          name: details.profile.full_name || details.profile.email,
                          email: details.profile.email,
                        })}
                      </p>
                      <p className="text-xs text-text-tertiary">{t("admin.userDetail.deleteConfirmHint")}</p>
                      <input
                        type="text"
                        placeholder={t("admin.userDetail.reasonPlaceholder")}
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        className="w-full h-10 px-3 bg-bg-primary border border-border rounded text-sm"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={acting}
                          className="bg-red hover:bg-red/90"
                          onClick={() => void handleDeleteUser()}
                        >
                          {acting ? t("admin.userDetail.deleting") : t("admin.userDetail.deleteConfirmSubmit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={acting}
                          onClick={() => setDeleteConfirm(false)}
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
      </div>
    );
  }

  const searchHeader = (
    <div className="border-b border-border p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.userDetail.searchPlaceholder")}
          className="h-10 w-full rounded-lg border border-border bg-bg-primary pl-9 pr-3 text-base text-text-primary outline-none focus:border-brand/40 sm:text-sm"
        />
      </div>
      <p className="mt-2 text-xs text-text-tertiary">
        {t("admin.allUsers")} ({filteredUsers.length})
      </p>
    </div>
  );

  return (
    <div className="space-y-5 max-w-6xl">
      <div className={cn("space-y-5", showDetail && "hidden lg:block")}>
        <AdminPageHeader
          title="Users"
          subtitle="View accounts, balances, and moderation actions."
          action={
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
          }
        />

      </div>

      {/* Mobile user list */}
      <Card className={cn("overflow-hidden p-0 lg:hidden", showDetail && "hidden")}>
        {renderUserList(searchHeader)}
      </Card>

      {/* Desktop split view */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-4">
        <Card className="overflow-hidden p-0">
          {searchHeader}
          {loading ? (
            <p className="p-8 text-center text-sm text-text-tertiary">Loading…</p>
          ) : filteredUsers.length === 0 ? (
            <p className="p-8 text-center text-sm text-text-tertiary">{t("admin.noUsers")}</p>
          ) : (
            <div className="max-h-[calc(100dvh-14rem)] overflow-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="sticky top-0 bg-bg-secondary text-[11px] uppercase tracking-wide text-text-tertiary">
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 font-semibold">{t("admin.name")}</th>
                    <th className="px-4 py-3 font-semibold">{t("admin.email")}</th>
                    <th className="px-4 py-3 font-semibold">{t("admin.userDetail.locationShort")}</th>
                    <th className="px-4 py-3 font-semibold">{t("admin.kyc")}</th>
                    <th className="px-4 py-3 font-semibold">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => openUser(u.id)}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-bg-hover",
                        selectedId === u.id && "bg-brand/5"
                      )}
                    >
                      <td className="max-w-[140px] truncate px-4 py-3 font-medium text-text-primary">
                        {u.full_name || "—"}
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-text-tertiary">{u.email}</td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-text-secondary">
                        {formatProfileLocation(u)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={u.kyc_status} />
                      </td>
                      <td className="px-4 py-3">
                        {u.is_suspended ? (
                          <StatusBadge status="suspended" />
                        ) : (
                          <span className="text-xs text-text-tertiary">Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="max-h-[calc(100dvh-14rem)] overflow-y-auto">
          {!selectedId ? (
            <p className="text-sm text-text-tertiary py-8 text-center">Select a user to view details.</p>
          ) : (
            renderUserDetails()
          )}
        </Card>
      </div>

      <AdminMobilePanel
        open={showDetail}
        title={detailTitle}
        subtitle={details?.profile.email}
        onClose={closeUser}
      >
        {renderUserDetails({ hideHeader: true })}
      </AdminMobilePanel>
    </div>
  );
}
