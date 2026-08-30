import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiSubscriptionRow } from "@/lib/supabase/types";

const AI_SELECT =
  "id, user_id, bot_id, bot_name, allocation, duration_hours, expires_at, crypto_asset, market, status, profit_earned, entry_price, last_mark_price, admin_pnl, last_sync_at, purchase_cost, created_at";

export async function syncUserAiBots(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.rpc("sync_user_ai_bots");
  if (error) throw new Error(error.message);
}

export async function markAiBotMarketPnl(
  supabase: SupabaseClient,
  subscriptionId: string,
  markPrice: number
): Promise<void> {
  const { error } = await supabase.rpc("mark_ai_bot_market_pnl", {
    p_subscription_id: subscriptionId,
    p_mark_price: markPrice,
  });
  if (error) throw new Error(error.message);
}

export async function getAiSubscriptions(
  supabase: SupabaseClient,
  userId: string
): Promise<AiSubscriptionRow[]> {
  const { data, error } = await supabase
    .from("ai_trading_subscriptions")
    .select(AI_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AiSubscriptionRow[];
}

export async function purchaseAiBot(
  supabase: SupabaseClient,
  params: {
    userId: string;
    botId: string;
    botName: string;
    allocation: number;
    durationHours: number;
    cryptoAsset: string;
    entryPrice: number;
  }
): Promise<AiSubscriptionRow> {
  const { data, error } = await supabase
    .from("ai_trading_subscriptions")
    .insert({
      user_id: params.userId,
      bot_id: params.botId,
      bot_name: params.botName,
      allocation: params.allocation,
      duration_hours: params.durationHours,
      crypto_asset: params.cryptoAsset,
      market: "crypto",
      status: "active",
      entry_price: params.entryPrice,
      last_mark_price: params.entryPrice,
      profit_earned: 0,
      admin_pnl: 0,
      purchase_cost: params.allocation,
    })
    .select(AI_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as AiSubscriptionRow;
}

export async function adminAdjustAiBotProfit(
  supabase: SupabaseClient,
  subscriptionId: string,
  amount: number,
  note?: string
) {
  const { data, error } = await supabase.rpc("admin_adjust_ai_bot_profit", {
    p_subscription_id: subscriptionId,
    p_amount: amount,
    p_note: note?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return data;
}
