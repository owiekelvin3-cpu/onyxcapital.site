import { createClient } from "@/lib/supabase/client";
import { SPOT_DEPOSIT_METHOD_ASSET } from "@/lib/spot-assets";
import { isSpotWalletDepositNotes } from "@/lib/spot-wallet-deposits";
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
  return data as AdminUserDetails;
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

export async function approveDeposit(
  depositId: string,
  userId: string,
  amount: number,
  method?: string
) {
  const supabase = createClient();

  let depositMethod = method;
  const { data: depositRow } = await supabase
    .from("deposits")
    .select("method, notes")
    .eq("id", depositId)
    .maybeSingle();

  if (!depositMethod) {
    depositMethod = depositRow?.method ?? undefined;
  }

  const depositNotes = depositRow?.notes;
  const cryptoAsset = depositMethod ? SPOT_DEPOSIT_METHOD_ASSET[depositMethod] : undefined;
  const spotWalletDeposit = isSpotWalletDepositNotes(depositNotes);

  const { error: depErr } = await supabase
    .from("deposits")
    .update({ status: "completed" as TransactionStatus })
    .eq("id", depositId);
  if (depErr) throw depErr;

  if (cryptoAsset && spotWalletDeposit) {
    const priceRes = await fetch("/api/prices");
    const priceJson = priceRes.ok ? await priceRes.json() : null;
    const pairs = (priceJson?.pairs ?? []) as Array<{ symbol: string; price: number }>;
    const pair = pairs.find((p) => p.symbol.toUpperCase().startsWith(`${cryptoAsset}/`));
    const unitPrice = cryptoAsset === "USDT" ? 1 : Number(pair?.price ?? 0);
    if (unitPrice <= 0) {
      throw new Error(`Could not price ${cryptoAsset} deposit for wallet credit.`);
    }

    const quantity = amount / unitPrice;
    const { data: existing } = await supabase
      .from("holdings")
      .select("quantity")
      .eq("user_id", userId)
      .eq("asset", cryptoAsset)
      .maybeSingle();

    const newQty = Number(existing?.quantity ?? 0) + quantity;
    const { error: holdErr } = await supabase.from("holdings").upsert(
      { user_id: userId, asset: cryptoAsset, quantity: newQty },
      { onConflict: "user_id,asset" }
    );
    if (holdErr) throw holdErr;

    const { error: settleErr } = await supabase.rpc("settle_pending_fees_from_deposit", {
      p_deposit_id: depositId,
    });
    if (settleErr) throw settleErr;
    return;
  }

  const [{ data: bal }, { data: profile }] = await Promise.all([
    supabase.from("balances").select("amount, currency").eq("user_id", userId).single(),
    supabase.from("profiles").select("preferred_currency").eq("id", userId).single(),
  ]);

  const currency = bal?.currency || profile?.preferred_currency || "USD";
  const newAmount = (bal?.amount ?? 0) + amount;
  const { error: balErr } = await supabase
    .from("balances")
    .upsert({ user_id: userId, amount: newAmount, currency }, { onConflict: "user_id" });
  if (balErr) throw balErr;

  const { error: settleErr } = await supabase.rpc("settle_pending_fees_from_deposit", {
    p_deposit_id: depositId,
  });
  if (settleErr) throw settleErr;
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
}

export async function rejectWithdrawal(withdrawalId: string, reason: string) {
  const supabase = createClient();
  const rejectionReason = reason.trim();
  if (rejectionReason.length < 8) {
    throw new Error("A rejection reason is required.");
  }
  const { error } = await supabase
    .from("withdrawals")
    .update({
      status: "rejected" as TransactionStatus,
      rejection_reason: rejectionReason,
    })
    .eq("id", withdrawalId);
  if (error) throw error;

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
