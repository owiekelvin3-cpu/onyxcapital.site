import type { SupabaseClient } from "@supabase/supabase-js";
import type { WithdrawalRow, WithdrawalEligibility } from "@/lib/supabase/types";
import type { WithdrawalDetails, WithdrawalMethodId } from "@/lib/withdrawal-options";

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

  return {
    pending_fees_count: pending,
    can_withdraw: true,
    is_suspended: isSuspended,
    suspension_reason: profileResult.data?.suspension_reason ?? null,
    kyc_status: profileResult.data?.kyc_status ?? "none",
    kyc_approved: kycApproved,
    portfolio: {},
  };
}

export async function getWithdrawalEligibility(
  supabase: SupabaseClient
): Promise<WithdrawalEligibility> {
  const { data, error } = await supabase.rpc("get_withdrawal_eligibility");

  if (!error && data) {
    return data as WithdrawalEligibility;
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
  }
): Promise<WithdrawalRow> {
  const { data, error } = await supabase
    .from("withdrawals")
    .insert({
      user_id: params.userId,
      amount: params.amount,
      currency: params.currency,
      method: params.method,
      wallet_address: params.destination,
      notes: JSON.stringify(params.details),
      status: "pending",
    })
    .select(
      "id, user_id, amount, currency, method, wallet_address, status, notes, created_at"
    )
    .single();

  if (error) throw new Error(error.message);
  return data as WithdrawalRow;
}
