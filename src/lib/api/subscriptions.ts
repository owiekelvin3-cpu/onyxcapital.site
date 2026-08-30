import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiSubscriptionRow, CopySubscriptionRow } from "@/lib/supabase/types";

export {
  getAiSubscriptions,
  purchaseAiBot,
} from "@/lib/api/ai-trading";

/** @deprecated Use purchaseAiBot from @/lib/api/ai-trading */
export async function subscribeToAiBot(
  supabase: SupabaseClient,
  params: {
    userId: string;
    botName: string;
    price: number;
    market?: string;
  }
): Promise<AiSubscriptionRow> {
  const { data, error } = await supabase
    .from("ai_trading_subscriptions")
    .insert({
      user_id: params.userId,
      bot_name: params.botName,
      allocation: params.price,
      purchase_cost: params.price,
      market: params.market ?? "multi",
      status: "active",
    })
    .select(
      "id, user_id, bot_name, allocation, market, status, profit_earned, created_at, expires_at"
    )
    .single();

  if (error) throw new Error(error.message);
  return data as AiSubscriptionRow;
}

export async function getCopySubscriptions(
  supabase: SupabaseClient,
  userId: string
): Promise<CopySubscriptionRow[]> {
  const { data, error } = await supabase
    .from("copy_trading_subscriptions")
    .select("id, user_id, trader_name, allocation, profit_earned, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CopySubscriptionRow[];
}

export async function subscribeToTrader(
  supabase: SupabaseClient,
  params: {
    userId: string;
    traderName: string;
    allocation: number;
  }
): Promise<CopySubscriptionRow> {
  const selectCols =
    "id, user_id, trader_name, allocation, profit_earned, status, created_at";

  const { data: existing, error: existingError } = await supabase
    .from("copy_trading_subscriptions")
    .select(selectCols)
    .eq("user_id", params.userId)
    .eq("trader_name", params.traderName)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing) {
    if (existing.status === "active") return existing as CopySubscriptionRow;

    const { data: reactivated, error: reactivateError } = await supabase
      .from("copy_trading_subscriptions")
      .update({ status: "active", allocation: params.allocation })
      .eq("id", existing.id)
      .eq("user_id", params.userId)
      .select(selectCols)
      .single();

    if (reactivateError) throw new Error(reactivateError.message);
    return reactivated as CopySubscriptionRow;
  }

  const { data, error } = await supabase
    .from("copy_trading_subscriptions")
    .insert({
      user_id: params.userId,
      trader_name: params.traderName,
      allocation: params.allocation,
      status: "active",
    })
    .select(selectCols)
    .single();

  if (error) throw new Error(error.message);
  return data as CopySubscriptionRow;
}

export async function uncopyTrader(
  supabase: SupabaseClient,
  traderName: string
): Promise<void> {
  const { error } = await supabase.rpc("uncopy_trader", {
    p_trader_name: traderName,
  });
  if (error) throw new Error(error.message);
}
