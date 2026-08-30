import type { SupabaseClient } from "@supabase/supabase-js";

export type UserFeeRow = {
  id: string;
  fee_type: string;
  label: string;
  amount: number;
  currency: string;
  status: string;
  notes: string | null;
  created_at: string;
};

export async function getPendingUserFees(
  supabase: SupabaseClient,
  userId: string
): Promise<UserFeeRow[]> {
  const { data, error } = await supabase
    .from("user_fees")
    .select("id, fee_type, label, amount, currency, status, notes, created_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as UserFeeRow[];
}

export function sumPendingFees(fees: UserFeeRow[]): number {
  return fees.reduce((sum, fee) => sum + Number(fee.amount), 0);
}
