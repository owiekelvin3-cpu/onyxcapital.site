import type { SupabaseClient } from "@supabase/supabase-js";
import type { TradeRow, HoldingRow, BalanceRow } from "@/lib/supabase/types";
import { priceForAsset } from "@/lib/market-prices";

export type PortfolioSummary = {
  cashBalance: number;
  holdingsValue: number;
  totalValue: number;
  holdingsCount: number;
  currency: string;
  totalDeposits: number;
  totalWithdrawals: number;
};

export async function getPortfolioSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<PortfolioSummary> {
  const [cashBalance, profileRes, depositsRes, withdrawalsRes] = await Promise.all([
    getUsdBalance(supabase, userId),
    supabase.from("profiles").select("preferred_currency").eq("id", userId).maybeSingle(),
    supabase
      .from("deposits")
      .select("amount")
      .eq("user_id", userId)
      .in("status", ["approved", "completed"]),
    supabase
      .from("withdrawals")
      .select("amount")
      .eq("user_id", userId)
      .in("status", ["approved", "completed"]),
  ]);

  const totalDeposits = (depositsRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );
  const totalWithdrawals = (withdrawalsRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );

  return {
    cashBalance,
    /** Spot crypto wallet — excluded from main portfolio total */
    holdingsValue: 0,
    totalValue: cashBalance,
    holdingsCount: 0,
    currency: profileRes.data?.preferred_currency ?? "USD",
    totalDeposits,
    totalWithdrawals,
  };
}

/** Spot desk only — not included in main portfolio total */
export async function getSpotHoldingsSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<{ holdingsValue: number; holdingsCount: number }> {
  const holdings = await getHoldings(supabase, userId);
  if (holdings.length === 0) {
    return { holdingsValue: 0, holdingsCount: 0 };
  }

  const values = await Promise.all(
    holdings.map(async (holding) => {
      const price = await priceForAsset(holding.asset);
      return holding.quantity * price;
    })
  );

  return {
    holdingsValue: values.reduce((sum, value) => sum + value, 0),
    holdingsCount: holdings.filter((h) => Number(h.quantity) > 0).length,
  };
}

export async function requestSpotHoldingWithdrawal(
  supabase: SupabaseClient,
  params: {
    asset: string;
    quantity: number;
    walletAddress: string;
    network: string;
    usdAmount: number;
  }
): Promise<string> {
  const { data, error } = await supabase.rpc("request_spot_holding_withdrawal", {
    p_asset: params.asset,
    p_quantity: params.quantity,
    p_wallet_address: params.walletAddress,
    p_network: params.network,
    p_usd_amount: params.usdAmount,
  });

  if (error) throw new Error(error.message);
  return String(data);
}

export async function getUsdBalance(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("balances")
    .select("amount")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return Number(data?.amount ?? 0);
}

export async function getRecentTrades(
  supabase: SupabaseClient,
  userId: string,
  limit = 10
): Promise<TradeRow[]> {
  const { data, error } = await supabase
    .from("trades")
    .select("id, user_id, asset, type, amount, price, status, profit, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as TradeRow[];
}

export async function getPendingTradesCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("trades")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function get24hProfit(
  supabase: SupabaseClient,
  userId: string
): Promise<number | null> {
  const since = new Date(Date.now() - 86400000).toISOString();
  const { data, error } = await supabase
    .from("trades")
    .select("profit")
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) throw new Error(error.message);
  if (!data?.length) return null;

  return data.reduce((sum, row) => sum + (row.profit ?? 0), 0);
}

/** Total realized profit: trade credits + admin profit/loss adjustments */
export async function getProfitTotal(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const [tradesRes, adjustmentsRes, copyProfitRes, referralRes] = await Promise.all([
    supabase.from("trades").select("profit").eq("user_id", userId),
    supabase.from("user_profit_adjustments").select("amount").eq("user_id", userId),
    supabase.from("copy_trading_profit_credits").select("amount").eq("user_id", userId),
    supabase.from("referral_rewards").select("amount").eq("referrer_id", userId),
  ]);

  if (tradesRes.error) throw new Error(tradesRes.error.message);
  if (adjustmentsRes.error) throw new Error(adjustmentsRes.error.message);
  if (copyProfitRes.error) throw new Error(copyProfitRes.error.message);
  if (referralRes.error) throw new Error(referralRes.error.message);

  const tradeProfit = (tradesRes.data ?? []).reduce((sum, row) => sum + Number(row.profit ?? 0), 0);
  const adjustmentTotal = (adjustmentsRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0
  );
  const copyProfitTotal = (copyProfitRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0
  );
  const referralTotal = (referralRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0
  );

  return Math.round((tradeProfit + adjustmentTotal + copyProfitTotal + referralTotal) * 100) / 100;
}

export async function getHoldings(
  supabase: SupabaseClient,
  userId: string
): Promise<HoldingRow[]> {
  const { data, error } = await supabase
    .from("holdings")
    .select("id, user_id, asset, quantity, updated_at")
    .eq("user_id", userId)
    .order("asset");

  if (error) throw new Error(error.message);
  return (data ?? []) as HoldingRow[];
}

export async function executeTrade(
  supabase: SupabaseClient,
  params: {
    userId: string;
    asset: string;
    type: "buy" | "sell";
    amount: number;
    price: number;
  }
): Promise<TradeRow> {
  const { data, error } = await supabase
    .from("trades")
    .insert({
      user_id: params.userId,
      asset: params.asset,
      type: params.type,
      amount: params.amount,
      price: params.price,
      status: "pending",
    })
    .select("id, user_id, asset, type, amount, price, status, created_at")
    .single();

  if (error) throw new Error(error.message);
  return data as TradeRow;
}

export function tradeNotional(trade: Pick<TradeRow, "amount" | "price">): number {
  return trade.amount * trade.price;
}

export type { BalanceRow };
