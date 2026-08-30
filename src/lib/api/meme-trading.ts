import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemeCoinRow } from "@/lib/meme-coins/types";
import { utcToday } from "@/lib/meme-coins/sync";

export type MemeHoldingRow = {
  id: string;
  user_id: string;
  meme_coin_id: string;
  quantity: number;
  avg_cost_usd: number | null;
  updated_at: string;
};

export type MemeTradeRow = {
  id: string;
  user_id: string;
  meme_coin_id: string;
  type: "buy" | "sell";
  quantity: number;
  price_usd: number;
  status: string;
  created_at: string;
};

export type MemeWalletItem = {
  holding: MemeHoldingRow;
  coin: MemeCoinRow;
  priceUsd: number;
  valueUsd: number;
  costBasis: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  change24h: number | null;
};

export function memeCoinPrice(coin: MemeCoinRow): number {
  return Number(coin.price_usd ?? 0);
}

export async function getMemeHoldings(
  supabase: SupabaseClient,
  userId: string
): Promise<MemeHoldingRow[]> {
  const { data, error } = await supabase
    .from("meme_holdings")
    .select("id, user_id, meme_coin_id, quantity, avg_cost_usd, updated_at")
    .eq("user_id", userId)
    .gt("quantity", 0)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as MemeHoldingRow[];
}

export async function getMemeWalletItems(
  supabase: SupabaseClient,
  userId: string
): Promise<MemeWalletItem[]> {
  const holdings = await getMemeHoldings(supabase, userId);
  if (holdings.length === 0) return [];

  const coinIds = holdings.map((h) => h.meme_coin_id);
  const { data: coins, error } = await supabase
    .from("daily_meme_coins")
    .select("*")
    .in("id", coinIds);

  if (error) throw new Error(error.message);

  const coinById = new Map((coins as MemeCoinRow[]).map((c) => [c.id, c]));

  return holdings
    .map((holding) => {
      const coin = coinById.get(holding.meme_coin_id);
      if (!coin) return null;
      const priceUsd = memeCoinPrice(coin);
      const quantity = Number(holding.quantity);
      const costBasis = quantity * Number(holding.avg_cost_usd ?? priceUsd);
      const valueUsd = quantity * priceUsd;
      const unrealizedPnl = valueUsd - costBasis;
      const unrealizedPnlPct = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;
      return {
        holding,
        coin,
        priceUsd,
        valueUsd,
        costBasis,
        unrealizedPnl,
        unrealizedPnlPct,
        change24h: coin.change_24h,
      } satisfies MemeWalletItem;
    })
    .filter(Boolean) as MemeWalletItem[];
}

export async function getTodayMemeMarket(
  supabase: SupabaseClient,
  listDate = utcToday()
): Promise<MemeCoinRow[]> {
  const { data, error } = await supabase
    .from("daily_meme_coins")
    .select("*")
    .eq("list_date", listDate)
    .eq("status", "active")
    .eq("source", "trending")
    .order("featured", { ascending: false })
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as MemeCoinRow[];
}

export async function getMemeTrades(
  supabase: SupabaseClient,
  userId: string,
  limit = 30
): Promise<MemeTradeRow[]> {
  const { data, error } = await supabase
    .from("meme_trades")
    .select("id, user_id, meme_coin_id, type, quantity, price_usd, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as MemeTradeRow[];
}

export async function executeMemeTrade(
  supabase: SupabaseClient,
  params: {
    userId: string;
    memeCoinId: string;
    type: "buy" | "sell";
    quantity: number;
    priceUsd: number;
  }
): Promise<MemeTradeRow> {
  const { data, error } = await supabase
    .from("meme_trades")
    .insert({
      user_id: params.userId,
      meme_coin_id: params.memeCoinId,
      type: params.type,
      quantity: params.quantity,
      price_usd: params.priceUsd,
      status: "pending",
    })
    .select("id, user_id, meme_coin_id, type, quantity, price_usd, status, created_at")
    .single();

  if (error) throw new Error(error.message);
  return data as MemeTradeRow;
}

export async function getMemeWalletSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<{ totalValue: number; coinCount: number }> {
  const items = await getMemeWalletItems(supabase, userId);
  return {
    totalValue: items.reduce((sum, item) => sum + item.valueUsd, 0),
    coinCount: items.length,
  };
}

export function heldMemeQuantity(
  items: MemeWalletItem[],
  memeCoinId: string
): number {
  const row = items.find((item) => item.coin.id === memeCoinId);
  return Number(row?.holding.quantity ?? 0);
}
