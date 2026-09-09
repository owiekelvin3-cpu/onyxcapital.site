import { createClient } from "@/lib/supabase/client";
import { SPOT_DEPOSIT_METHOD_ASSET } from "@/lib/spot-assets";
import { isSpotWalletDepositNotes } from "@/lib/spot-wallet-deposits";
import { getDepositCredits } from "@/lib/api/trading";
import type {
  AdminBalanceDirection,
  AdminModerationUiAction,
  AdminUserDetails,
  TransactionStatus,
} from "@/lib/admin-types";

function rpcError(error: { message?: string; details?: string; hint?: string } | null, fallback: string) {
  if (!error) return fallback;
  return [error.message, error.details, error.hint].filter(Boolean).join(" — ") || fallback;
}

export async function fetchAdminUserDetails(userId: string): Promise<AdminUserDetails> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_get_user_details", { p_user_id: userId });
  if (error) throw new Error(rpcError(error, "Could not load user details."));
  const details = data as AdminUserDetails;
  details.deposit_credits = await getDepositCredits(supabase, userId);
  return details;
}

export async function moderateAdminUser(params: {
  userId: string;
  action: AdminModerationUiAction;
  reason?: string;
}) {
  const supabase = createClient();
  const reason =
    params.action === "unsuspend" && (!params.reason || params.reason.trim().length < 3)
      ? "Suspension lifted by team"
      : (params.reason ?? "").trim();

  const { error } = await supabase.rpc("admin_moderate_user", {
    p_user_id: params.userId,
    p_action: params.action,
    p_reason: reason,
  });
  if (error) throw new Error(rpcError(error, "Could not complete that action."));
}

export async function deleteAdminUser(params: { userId: string; reason: string }) {
  const supabase = createClient();
  const reason = params.reason.trim();
  if (reason.length < 3) {
    throw new Error("A reason of at least 3 characters is required.");
  }

  const { error } = await supabase.rpc("admin_delete_user", {
    p_user_id: params.userId,
    p_reason: reason,
  });
  if (error) throw new Error(rpcError(error, "Could not delete user."));
}

export async function adjustAdminUserBalance(params: {
  userId: string;
  direction: AdminBalanceDirection;
  amount: number;
  reason: string;
}) {
  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  const reason = params.reason.trim() || "Admin balance adjustment";
  if (reason.length < 3) {
    throw new Error("A reason of at least 3 characters is required.");
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_adjust_user_balance", {
    p_user_id: params.userId,
    p_direction: params.direction,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) throw new Error(rpcError(error, "Could not adjust balance."));
  return data as {
    ok?: boolean;
    direction?: AdminBalanceDirection;
    amount?: number;
    balance_before?: number;
    balance_after?: number;
    reason?: string;
  };
}

export async function adjustAdminUserProfit(params: {
  userId: string;
  amount: number;
  note?: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_adjust_user_profit", {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_note: params.note?.trim() || null,
  });
  if (error) throw new Error(rpcError(error, "Could not adjust profit."));
  return data as {
    profit_total?: number;
    balance_after?: number;
    amount?: number;
  };
}

export async function adjustAdminUserDeposit(params: {
  userId: string;
  direction: AdminBalanceDirection;
  amount: number;
  note?: string;
  availableDeposit?: number;
}): Promise<{
  ok?: boolean;
  direction?: AdminBalanceDirection;
  amount?: number;
  balance_after?: number;
  deposit_after?: number;
  reason?: string;
}> {
  const amount = parsePositiveUsdAmount(params.amount);
  const note = params.note?.trim() || undefined;

  if (
    params.direction === "debit" &&
    typeof params.availableDeposit === "number" &&
    amount > Math.round(Math.max(0, params.availableDeposit) * 100) / 100
  ) {
    throw new Error("That amount is more than the user's Deposit balance.");
  }

  const supabase = createClient();
  const rpc = await supabase.rpc("admin_adjust_user_deposit", {
    p_user_id: params.userId,
    p_direction: params.direction,
    p_amount: amount,
    p_note: note ?? null,
  });
  const signed = params.direction === "credit" ? amount : -amount;

  if (!rpc.error) {
    const result = rpc.data as {
      ok?: boolean;
      direction?: AdminBalanceDirection;
      amount?: number;
      balance_before?: number;
      balance_after?: number;
      deposit_after?: number;
      reason?: string;
    };
    await ensureDepositAdjustmentLedger(supabase, {
      userId: params.userId,
      signedAmount: signed,
      note: note ?? null,
      balanceBefore: Number(result.balance_before ?? 0),
      balanceAfter: Number(result.balance_after ?? 0),
    });
    return result;
  }

  if (!isMissingRpc(rpc.error.message ?? "")) {
    throw new Error(rpcError(rpc.error, "Could not adjust deposit balance."));
  }

  const reason = note
    ? `Deposit balance ${params.direction}: ${note}`
    : `Deposit balance ${params.direction}`;

  const fallback = await adjustAdminUserBalance({
    userId: params.userId,
    direction: params.direction,
    amount,
    reason,
  });

  await ensureDepositAdjustmentLedger(supabase, {
    userId: params.userId,
    signedAmount: signed,
    note: note ?? null,
    balanceBefore: Number(fallback.balance_before ?? 0),
    balanceAfter: Number(fallback.balance_after ?? 0),
  });

  const depositAfter =
    params.direction === "credit"
      ? (params.availableDeposit ?? 0) + amount
      : Math.max(0, (params.availableDeposit ?? 0) - amount);

  return {
    ...fallback,
    deposit_after: Math.round(depositAfter * 100) / 100,
  };
}

export async function adjustAdminMemeCoinProfit(params: {
  memeCoinId: string;
  priceUsd: number;
  change24h: number;
  lock?: boolean;
  note?: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_adjust_meme_coin_profit", {
    p_meme_coin_id: params.memeCoinId,
    p_price_usd: params.priceUsd,
    p_change_24h: params.change24h,
    p_lock: params.lock ?? true,
    p_note: params.note?.trim() || null,
  });
  if (error) throw new Error(rpcError(error, "Could not update meme coin profit."));
  return data as {
    ok?: boolean;
    symbol?: string;
    price_usd?: number;
    change_24h?: number;
  };
}

export function parsePositiveUsdAmount(raw: string | number) {
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, "").trim());
  if (!Number.isFinite(n)) {
    throw new Error("Enter a valid amount greater than zero.");
  }
  if (n <= 0) {
    throw new Error("Amount must be greater than zero.");
  }
  const rounded = Math.round(n * 100) / 100;
  if (rounded <= 0) {
    throw new Error("Amount must be greater than zero.");
  }
  if (rounded > 99_999_999.99) {
    throw new Error("Amount is too large.");
  }
  return rounded;
}

export function depositOriginalAmount(row: { amount: number; original_amount?: number | null }) {
  const original = Number(row.original_amount);
  if (Number.isFinite(original) && original > 0) return original;
  return Number(row.amount) || 0;
}

export function depositAmountWasCorrected(row: { amount: number; original_amount?: number | null }) {
  return Math.round(depositOriginalAmount(row) * 100) !== Math.round(Number(row.amount) * 100);
}

export async function correctDepositAmount(depositId: string, amountInput: string | number) {
  const amount = parsePositiveUsdAmount(amountInput);
  const supabase = createClient();
  const rpc = await supabase.rpc("admin_correct_deposit_amount", {
    p_deposit_id: depositId,
    p_amount: amount,
  });
  if (!rpc.error) {
    return rpc.data as {
      ok?: boolean;
      amount?: number;
      original_amount?: number;
      previous_amount?: number;
    };
  }

  if (!isMissingRpc(rpc.error.message ?? "")) {
    throw new Error(rpcError(rpc.error, "Could not update deposit amount."));
  }

  const { data: row, error: loadErr } = await supabase
    .from("deposits")
    .select("id, amount, status")
    .eq("id", depositId)
    .maybeSingle();
  if (loadErr) throw new Error(rpcError(loadErr, "Could not update deposit amount."));
  if (!row) throw new Error("Deposit not found.");
  if (row.status !== "pending") throw new Error("Only pending deposits can be edited.");

  const original = Number(row.amount);
  const { data: userData } = await supabase.auth.getUser();
  const withAudit: Record<string, unknown> = {
    amount,
    original_amount: original,
    amount_corrected_at: new Date().toISOString(),
    amount_corrected_by: userData.user?.id ?? null,
  };

  let { error } = await supabase
    .from("deposits")
    .update(withAudit)
    .eq("id", depositId)
    .eq("status", "pending");

  if (error && /column|schema cache|does not exist/i.test(error.message)) {
    ({ error } = await supabase.from("deposits").update({ amount }).eq("id", depositId).eq("status", "pending"));
  }
  if (error) throw new Error(rpcError(error, "Could not update deposit amount."));

  return { ok: true, amount, original_amount: original, previous_amount: original };
}

export async function approveDeposit(
  depositId: string,
  userId?: string,
  amount?: number,
  method?: string
) {
  const supabase = createClient();

  const { data: depositRow, error: loadErr } = await supabase
    .from("deposits")
    .select("user_id, amount, method, notes, status")
    .eq("id", depositId)
    .maybeSingle();
  if (loadErr) throw loadErr;
  if (!depositRow) throw new Error("Deposit not found.");
  if (depositRow.status !== "pending") {
    throw new Error("This deposit is no longer pending.");
  }

  const creditedUserId = depositRow.user_id || userId;
  if (!creditedUserId) throw new Error("Deposit is missing a user.");

  const creditedAmount = parsePositiveUsdAmount(depositRow.amount ?? amount ?? 0);
  const depositMethod = method ?? depositRow.method ?? undefined;

  const depositNotes = depositRow.notes;
  const cryptoAsset = depositMethod ? SPOT_DEPOSIT_METHOD_ASSET[depositMethod] : undefined;
  const spotWalletDeposit = isSpotWalletDepositNotes(depositNotes);

  const { data: completed, error: depErr } = await supabase
    .from("deposits")
    .update({ status: "completed" as TransactionStatus })
    .eq("id", depositId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (depErr) throw depErr;
  if (!completed) throw new Error("This deposit is no longer pending.");

  if (cryptoAsset && spotWalletDeposit) {
    const priceRes = await fetch("/api/prices");
    const priceJson = priceRes.ok ? await priceRes.json() : null;
    const pairs = (priceJson?.pairs ?? []) as Array<{ symbol: string; price: number }>;
    const pair = pairs.find((p) => p.symbol.toUpperCase().startsWith(`${cryptoAsset}/`));
    const unitPrice = cryptoAsset === "USDT" ? 1 : Number(pair?.price ?? 0);
    if (unitPrice <= 0) {
      throw new Error(`Could not price ${cryptoAsset} deposit for wallet credit.`);
    }

    const quantity = creditedAmount / unitPrice;
    const { data: existing } = await supabase
      .from("holdings")
      .select("quantity")
      .eq("user_id", creditedUserId)
      .eq("asset", cryptoAsset)
      .maybeSingle();

    const newQty = Number(existing?.quantity ?? 0) + quantity;
    const { error: holdErr } = await supabase.from("holdings").upsert(
      { user_id: creditedUserId, asset: cryptoAsset, quantity: newQty },
      { onConflict: "user_id,asset" }
    );
    if (holdErr) throw holdErr;

    const { error: settleErr } = await supabase.rpc("settle_pending_fees_from_deposit", {
      p_deposit_id: depositId,
    });
    if (settleErr) throw settleErr;
    return { amount: creditedAmount };
  }

  const [{ data: bal }, { data: profile }] = await Promise.all([
    supabase.from("balances").select("amount, currency").eq("user_id", creditedUserId).single(),
    supabase.from("profiles").select("preferred_currency").eq("id", creditedUserId).single(),
  ]);

  const currency = bal?.currency || profile?.preferred_currency || "USD";
  const newAmount = (bal?.amount ?? 0) + creditedAmount;
  const { error: balErr } = await supabase
    .from("balances")
    .upsert({ user_id: creditedUserId, amount: newAmount, currency }, { onConflict: "user_id" });
  if (balErr) throw balErr;

  const { error: settleErr } = await supabase.rpc("settle_pending_fees_from_deposit", {
    p_deposit_id: depositId,
  });
  if (settleErr) throw settleErr;
  return { amount: creditedAmount };
}

export async function rejectDeposit(depositId: string, reason: string) {
  const supabase = createClient();
  const rejectionReason = reason.trim();
  if (rejectionReason.length < 8) {
    throw new Error("A rejection reason is required.");
  }
  const { error } = await supabase
    .from("deposits")
    .update({
      status: "rejected" as TransactionStatus,
      rejection_reason: rejectionReason,
    })
    .eq("id", depositId);
  if (error) throw error;
}

export async function completeWithdrawal(withdrawalId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("withdrawals")
    .update({ status: "completed" as TransactionStatus })
    .eq("id", withdrawalId);
  if (error) throw error;

  const { error: clawErr } = await supabase.rpc("apply_withdrawal_profit_clawback", {
    p_withdrawal_id: withdrawalId,
  });
  if (clawErr && !isMissingRpc(clawErr.message)) {
    throw new Error(rpcError(clawErr, "Withdrawal completed, but profit was not reduced."));
  }
}

function isMissingRpc(message: string) {
  return /could not find the function|schema cache|does not exist/i.test(message);
}

async function ensureDepositAdjustmentLedger(
  supabase: ReturnType<typeof createClient>,
  params: {
    userId: string;
    signedAmount: number;
    note?: string | null;
    balanceBefore: number;
    balanceAfter: number;
  }
) {
  const { data: latest, error: readErr } = await supabase
    .from("user_deposit_adjustments")
    .select("id, amount, created_at")
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readErr) return;

  if (
    latest &&
    Math.abs(Number(latest.amount) - params.signedAmount) < 0.005 &&
    Date.now() - new Date(latest.created_at).getTime() < 15_000
  ) {
    return;
  }

  const { data: authUser } = await supabase.auth.getUser();
  await supabase.from("user_deposit_adjustments").insert({
    user_id: params.userId,
    admin_id: authUser.user?.id ?? params.userId,
    amount: params.signedAmount,
    note: params.note ?? null,
    balance_before: params.balanceBefore,
    balance_after: params.balanceAfter,
  });
}

export async function rejectWithdrawal(withdrawalId: string, reason: string) {
  const supabase = createClient();
  const rejectionReason = reason.trim();
  if (rejectionReason.length < 8) {
    throw new Error("A rejection reason is required.");
  }

  const { error } = await supabase.rpc("admin_reject_withdrawal", {
    p_withdrawal_id: withdrawalId,
    p_reason: rejectionReason,
  });
  if (!error) return;

  if (!isMissingRpc(error.message)) {
    throw new Error(rpcError(error, "Could not reject withdrawal."));
  }

  const { error: updateErr } = await supabase
    .from("withdrawals")
    .update({
      status: "rejected" as TransactionStatus,
      rejection_reason: rejectionReason,
    })
    .eq("id", withdrawalId);
  if (updateErr) throw updateErr;

  // Cash is already returned by the database reject trigger. Only restore spot coins.
  await supabase.rpc("restore_spot_holding_on_withdrawal_reject", {
    p_withdrawal_id: withdrawalId,
  });
}

export async function updateKycStatus(
  submissionId: string,
  userId: string,
  status: "approved" | "rejected",
  notes?: string
) {
  const supabase = createClient();
  const { error: kycErr } = await supabase
    .from("kyc_submissions")
    .update({ status, notes: notes ?? null })
    .eq("id", submissionId);
  if (kycErr) throw kycErr;

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ kyc_status: status })
    .eq("id", userId);
  if (profileErr) throw profileErr;
}

export async function fetchDepositConfig() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "deposit_config")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.value as { cryptoWallets?: Record<string, string> } | null) ?? null;
}

export async function setAdminUserSignalPct(params: {
  userId: string;
  pct: number;
  note?: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_set_user_signal_pct", {
    p_user_id: params.userId,
    p_pct: params.pct,
    p_note: params.note?.trim() || null,
  });
  if (error) throw new Error(rpcError(error, "Could not update signal allocation."));
  return data as { signal_pct?: number; previous_pct?: number };
}

export async function bulkAdjustAdminSignalPct(params: { delta: number; note?: string }) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_bulk_adjust_signal_pct", {
    p_delta: params.delta,
    p_note: params.note?.trim() || null,
  });
  if (error) throw new Error(rpcError(error, "Could not bulk adjust signal allocation."));
  return data as { users_updated?: number; delta?: number };
}

export async function assignAdminUserFee(params: {
  userId: string;
  feeType: string;
  label: string;
  amount: number;
  notes?: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_assign_user_fee", {
    p_user_id: params.userId,
    p_fee_type: params.feeType,
    p_label: params.label.trim(),
    p_amount: params.amount,
    p_notes: params.notes?.trim() || null,
  });
  if (error) throw new Error(rpcError(error, "Could not assign withdrawal fee."));
  return data as { id?: string; amount?: number; label?: string };
}

export async function updateAdminUserFeeStatus(params: {
  feeId: string;
  status: "paid" | "waived" | "cancelled";
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_update_user_fee_status", {
    p_fee_id: params.feeId,
    p_status: params.status,
  });
  if (error) throw new Error(rpcError(error, "Could not update fee status."));
  return data as { id?: string; status?: string };
}

export function generateWithdrawalCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function setAdminUserWithdrawalCode(params: {
  userId: string;
  code: string | null;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_set_user_withdrawal_code", {
    p_user_id: params.userId,
    p_code: params.code,
  });
  if (error) throw new Error(rpcError(error, "Could not update withdrawal code."));
  return data as { ok?: boolean; has_code?: boolean; withdrawal_code?: string | null };
}

export async function grantAdminUserSignal(params: {
  userId: string;
  packageId: string;
  packageName: string;
  durationDays?: number;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_grant_user_signal", {
    p_user_id: params.userId,
    p_package_id: params.packageId,
    p_package_name: params.packageName,
    p_duration_days: params.durationDays ?? 30,
  });
  if (error) throw new Error(rpcError(error, "Could not grant signal access."));
  return data as { package_id?: string; expires_at?: string };
}

export async function updateDepositWallets(cryptoWallets: Record<string, string>) {
  const supabase = createClient();
  const { data: existing, error: loadError } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "deposit_config")
    .maybeSingle();

  if (loadError) throw new Error(loadError.message);

  const current = (existing?.value as Record<string, unknown> | null) ?? {};
  const updated = {
    ...current,
    cryptoWallets,
  };

  const { error } = await supabase
    .from("platform_settings")
    .update({ value: updated, updated_at: new Date().toISOString() })
    .eq("key", "deposit_config");

  if (error) throw new Error(error.message);
}

export type AdminPopupSend = {
  id: string;
  title: string;
  message: string;
  user_id: string | null;
  recipient_count: number;
  created_at: string;
};

export async function sendAdminUserPopup(params: {
  title: string;
  message: string;
  userId?: string | null;
}) {
  const title = params.title.trim();
  const message = params.message.trim();
  if (title.length < 2) throw new Error("Add a title for the popup.");
  if (message.length < 2) throw new Error("Write the popup message.");

  const supabase = createClient();
  const rpc = await supabase.rpc("admin_send_user_popup", {
    p_title: title,
    p_message: message,
    p_user_id: params.userId?.trim() || null,
  });
  if (!rpc.error) {
    return rpc.data as { ok?: boolean; recipient_count?: number };
  }

  const targetId = params.userId?.trim() || "";
  let userIds: string[] = [];
  if (targetId) {
    userIds = [targetId];
  } else {
    const { data, error } = await supabase.from("profiles").select("id, role");
    if (error) throw new Error(rpcError(error, "Could not load users."));
    userIds = (data ?? [])
      .filter((row) => row.role !== "admin")
      .map((row) => row.id);
  }

  if (userIds.length === 0) throw new Error("No users to notify.");

  const withKind = userIds.map((user_id) => ({
    user_id,
    title,
    message,
    kind: "popup",
  }));
  const withoutKind = userIds.map((user_id) => ({ user_id, title, message }));

  for (let i = 0; i < userIds.length; i += 100) {
    const chunk = withKind.slice(i, i + 100);
    const first = await supabase.from("notifications").insert(chunk);
    if (first.error) {
      const fallback = await supabase.from("notifications").insert(withoutKind.slice(i, i + 100));
      if (fallback.error) throw new Error(rpcError(fallback.error, "Could not send popup."));
    }
  }

  return { ok: true, recipient_count: userIds.length };
}

export async function listAdminPopupSends(): Promise<AdminPopupSend[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("admin_popup_sends")
    .select("id, title, message, user_id, recipient_count, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return (data ?? []) as AdminPopupSend[];
}
