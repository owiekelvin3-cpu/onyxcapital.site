import type { SupabaseClient } from "@supabase/supabase-js";
import type { WithdrawalRow, WithdrawalEligibility } from "@/lib/supabase/types";
import type { WithdrawalDetails, WithdrawalMethodId } from "@/lib/withdrawal-options";

function asJson<T>(data: unknown): T | null {
  if (data == null) return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }
  if (typeof data === "object") return data as T;
  return null;
}

function withdrawalCodeError(message: string): Error | null {
  const lower = message.toLowerCase();
  if (lower.includes("no withdrawal code assigned")) {
    return new Error("No withdrawal code assigned");
  }
  if (lower.includes("invalid withdrawal code")) {
    return new Error("Invalid withdrawal code");
  }
  return null;
}

async function resolveHasWithdrawalCode(
  supabase: SupabaseClient,
  current?: boolean
): Promise<boolean | undefined> {
  if (typeof current === "boolean") return current;

  const { data, error } = await supabase.rpc("has_active_withdrawal_code");
  if (error) return undefined;
  return Boolean(data);
}

async function fallbackEligibility(
  supabase: SupabaseClient
): Promise<WithdrawalEligibility> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count, error: feesError }, profileResult] = await Promise.all([
    supabase
      .from("user_fees")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    user
      ? supabase
          .from("profiles")
          .select("is_suspended, suspension_reason, kyc_status")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (feesError) throw new Error(feesError.message);

  const pending = count ?? 0;
  const isSuspended = Boolean(profileResult.data?.is_suspended);
  const kycApproved = profileResult.data?.kyc_status === "approved";
  const hasCode = await resolveHasWithdrawalCode(supabase);

  return {
    pending_fees_count: pending,
    can_withdraw: true,
    is_suspended: isSuspended,
    suspension_reason: profileResult.data?.suspension_reason ?? null,
    kyc_status: profileResult.data?.kyc_status ?? "none",
    kyc_approved: kycApproved,
    has_withdrawal_code: hasCode,
    portfolio: {},
  };
}

export async function getWithdrawalEligibility(
  supabase: SupabaseClient
): Promise<WithdrawalEligibility> {
  const { data, error } = await supabase.rpc("get_withdrawal_eligibility");
  const parsed = !error ? asJson<WithdrawalEligibility>(data) : null;

  if (parsed) {
    return {
      ...parsed,
      can_withdraw: parsed.can_withdraw !== false,
      has_withdrawal_code: await resolveHasWithdrawalCode(supabase, parsed.has_withdrawal_code),
    };
  }

  return fallbackEligibility(supabase);
}

export async function getUserWithdrawals(
  supabase: SupabaseClient,
  userId: string
): Promise<WithdrawalRow[]> {
  const { data, error } = await supabase
    .from("withdrawals")
    .select(
      "id, user_id, amount, currency, method, wallet_address, status, notes, rejection_reason, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return (data ?? []) as WithdrawalRow[];
}

export async function submitWithdrawal(
  supabase: SupabaseClient,
  params: {
    userId: string;
    amount: number;
    currency: string;
    method: WithdrawalMethodId;
    destination: string;
    details: WithdrawalDetails;
    withdrawalCode: string;
  }
): Promise<WithdrawalRow> {
  const notes = JSON.stringify(params.details);
  const { data: rpcData, error: rpcError } = await supabase.rpc("request_user_withdrawal", {
    p_amount: params.amount,
    p_currency: params.currency,
    p_method: params.method,
    p_wallet_address: params.destination,
    p_notes: notes,
    p_withdrawal_code: params.withdrawalCode,
  });

  if (!rpcError && rpcData) {
    const row = asJson<WithdrawalRow>(rpcData);
    if (row?.id) return row;
  }

  const rpcMessage = rpcError?.message ?? "";
  const rpcMapped = withdrawalCodeError(rpcMessage);
  if (rpcMapped) throw rpcMapped;

  const insertWithCode = await supabase
    .from("withdrawals")
    .insert({
      user_id: params.userId,
      amount: params.amount,
      currency: params.currency,
      method: params.method,
      wallet_address: params.destination,
      notes,
      status: "pending",
      withdrawal_code: params.withdrawalCode,
    })
    .select(
      "id, user_id, amount, currency, method, wallet_address, status, notes, created_at"
    )
    .single();

  if (!insertWithCode.error && insertWithCode.data) {
    return insertWithCode.data as WithdrawalRow;
  }

  const insertMessage = insertWithCode.error?.message ?? rpcMessage;
  const insertMapped = withdrawalCodeError(insertMessage);
  if (insertMapped) throw insertMapped;

  const missingColumn = /withdrawal_code|schema cache|could not find the function/i.test(
    insertMessage
  );
  if (!missingColumn) {
    throw new Error(insertMessage || "Withdrawal failed");
  }

  const legacy = await supabase
    .from("withdrawals")
    .insert({
      user_id: params.userId,
      amount: params.amount,
      currency: params.currency,
      method: params.method,
      wallet_address: params.destination,
      notes,
      status: "pending",
    })
    .select(
      "id, user_id, amount, currency, method, wallet_address, status, notes, created_at"
    )
    .single();

  if (legacy.error) {
    throw withdrawalCodeError(legacy.error.message) ?? new Error(legacy.error.message);
  }
  return legacy.data as WithdrawalRow;
}
