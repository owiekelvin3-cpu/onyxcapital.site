import type { SupabaseClient } from "@supabase/supabase-js";
import {
  eventFromProfitCredit,
  type CopyTradingProfitCreditRow,
  type CopyTradingProfitEvent,
} from "@/lib/copy-trading-profit";

export async function adminAdjustCopyTradingProfit(
  supabase: SupabaseClient,
  subscriptionId: string,
  amount: number,
  note?: string
) {
  const { data, error } = await supabase.rpc("admin_adjust_copy_trading_profit", {
    p_subscription_id: subscriptionId,
    p_amount: amount,
    p_note: note?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return data as {
    profit_after?: number;
    balance_after?: number;
    amount?: number;
    trader_name?: string;
  };
}

export async function getPendingCopyProfitOverlays(
  supabase: SupabaseClient,
  userId: string
): Promise<CopyTradingProfitEvent[]> {
  const { data, error } = await supabase
    .from("copy_trading_profit_credits")
    .select("id, trader_name, amount")
    .eq("user_id", userId)
    .gt("amount", 0)
    .is("overlay_shown_at", null)
    .order("created_at", { ascending: true })
    .limit(8);

  if (error) throw new Error(error.message);

  return ((data ?? []) as CopyTradingProfitCreditRow[])
    .map((row) => eventFromProfitCredit(row))
    .filter((event): event is CopyTradingProfitEvent => event !== null);
}

export async function markCopyProfitOverlayShown(
  supabase: SupabaseClient,
  creditId: string
): Promise<void> {
  const { error } = await supabase.rpc("mark_copy_profit_overlay_shown", {
    p_credit_id: creditId,
  });
  if (error) throw new Error(error.message);
}
