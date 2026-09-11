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
    withdrawalCode: string;
  }
): Promise<string> {
  const withCode = await supabase.rpc("request_spot_holding_withdrawal", {
    p_asset: params.asset,
    p_quantity: params.quantity,
    p_wallet_address: params.walletAddress,
    p_network: params.network,
    p_usd_amount: params.usdAmount,
    p_withdrawal_code: params.withdrawalCode,
  });

  if (!withCode.error) return String(withCode.data);

  const message = withCode.error.message.toLowerCase();
  if (message.includes("no withdrawal code assigned")) {
    throw new Error("No withdrawal code assigned");
  }
  if (message.includes("invalid withdrawal code")) {
    throw new Error("Invalid withdrawal code");
  }

  const retryWithoutCode =
    message.includes("could not find the function") ||
    message.includes("schema cache") ||
    message.includes("p_withdrawal_code");

  if (!retryWithoutCode) {
    throw new Error(withCode.error.message);
  }

  const legacy = await supabase.rpc("request_spot_holding_withdrawal", {
    p_asset: params.asset,
    p_quantity: params.quantity,
    p_wallet_address: params.walletAddress,
    p_network: params.network,
    p_usd_amount: params.usdAmount,
  });

  if (legacy.error) throw new Error(legacy.error.message);
  return String(legacy.data);
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

function money(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export type WalletSplit = {
  cash: number;
  profit: number;
  deposit: number;
  credits: number;
  userDeposits: number;
  buySpend: number;
};

async function rpcMoney(
  supabase: SupabaseClient,
  fn: "user_deposit_balance" | "user_deposit_credits" | "user_deposit_spend",
  userId: string
): Promise<number | null> {
  const { data, error } = await supabase.rpc(fn, { p_user_id: userId });
  if (error || data == null) return null;
  const value = Number(data);
  if (!Number.isFinite(value)) return null;
  return money(value);
}

function profitFromCashAndDeposit(lifetimeProfit: number, cashBalance: number, deposit: number): number {
  const cash = money(Math.max(0, cashBalance));
  const profit = money(lifetimeProfit);
  if (cash <= 0) return 0;
  if (profit <= 0) return profit;
  return Math.min(profit, money(Math.max(0, cash - deposit)));
}

/** User deposits + admin Add/Remove funds. Cash already nets spending. */
export function depositPrincipal(
  userDeposits = 0,
  adminDepositCredits = 0,
  _buySpend = 0
): number {
  return money(userDeposits + adminDepositCredits);
}

/** Deposit balance is only user deposits and admin deposit adjustments. */
export function depositOnAccount(
  cashBalance: number,
  _lifetimeProfit: number,
  depositCredits = 0,
  userDeposits = 0,
  buySpend = 0
): number {
  const cash = Math.round(Math.max(0, Number(cashBalance) || 0) * 100) / 100;
  const principal = depositPrincipal(userDeposits, depositCredits, buySpend);
  return Math.round(Math.max(0, Math.min(cash, principal)) * 100) / 100;
}

/** Profit still sitting in the account — never more than cash after Deposit balance. */
export function profitOnAccount(
  lifetimeProfit: number,
  cashBalance: number,
  depositCredits = 0,
  userDeposits = 0,
  buySpend = 0
): number {
  const cash = Math.round(Math.max(0, Number(cashBalance) || 0) * 100) / 100;
  const profit = money(lifetimeProfit);
  if (cash <= 0) return 0;
  const deposit = depositOnAccount(cash, profit, depositCredits, userDeposits, buySpend);
  if (profit <= 0) return profit;
  return Math.min(profit, Math.round(Math.max(0, cash - deposit) * 100) / 100);
}

export async function getDepositCredits(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const rpc = await supabase.rpc("user_deposit_credits", { p_user_id: userId });
  if (!rpc.error && rpc.data != null) {
    return Math.round(Number(rpc.data) * 100) / 100;
  }

  const { data: ledger, error: ledgerErr } = await supabase
    .from("user_deposit_adjustments")
    .select("amount")
    .eq("user_id", userId);
  if (!ledgerErr) {
    const total = (ledger ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    if ((ledger?.length ?? 0) > 0) return Math.round(total * 100) / 100;
  }

  const { data: tagged, error: taggedErr } = await supabase
    .from("admin_balance_adjustments")
    .select("direction, amount, reason")
    .eq("user_id", userId)
    .ilike("reason", "Deposit balance%");
  if (taggedErr) return 0;

  const taggedTotal = (tagged ?? []).reduce((sum, row) => {
    const amount = Number(row.amount ?? 0);
    return sum + (String(row.direction).toLowerCase() === "debit" ? -amount : amount);
  }, 0);
  return Math.round(taggedTotal * 100) / 100;
}

export async function getApprovedDepositTotal(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("deposits")
    .select("amount")
    .eq("user_id", userId)
    .in("status", ["approved", "completed"]);
  if (error) return 0;
  return money((data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0));
}

export async function getLiveBuySpend(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  return getDepositSpend(supabase, userId);
}

export async function getDepositSpend(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const [tradesRes, signalsRes, copyRes, aiRes, miningRes, memeRes] = await Promise.all([
    supabase.from("trades").select("amount, price, status").eq("user_id", userId).eq("type", "buy"),
    supabase.from("signal_packages").select("price").eq("user_id", userId),
    supabase.from("copy_trading_subscriptions").select("allocation").eq("user_id", userId),
    supabase.from("ai_trading_subscriptions").select("purchase_cost, allocation").eq("user_id", userId),
    supabase.from("mining_packages").select("investment").eq("user_id", userId),
    supabase.from("meme_trades").select("quantity, price_usd, status, type").eq("user_id", userId).eq("type", "buy"),
  ]);

  let total = 0;

  if (!tradesRes.error) {
    total += (tradesRes.data ?? []).reduce((sum, row) => {
      const status = String(row.status ?? "").toLowerCase();
      if (status === "rejected" || status === "cancelled") return sum;
      return sum + Number(row.amount ?? 0) * Number(row.price ?? 0);
    }, 0);
  }

  if (!signalsRes.error) {
    total += (signalsRes.data ?? []).reduce((sum, row) => sum + Math.max(0, Number(row.price ?? 0)), 0);
  }

  if (!copyRes.error) {
    total += (copyRes.data ?? []).reduce((sum, row) => sum + Math.max(0, Number(row.allocation ?? 0)), 0);
  }

  if (!aiRes.error) {
    total += (aiRes.data ?? []).reduce((sum, row) => {
      const cost = Number(row.purchase_cost ?? row.allocation ?? 0);
      return sum + Math.max(0, cost);
    }, 0);
  }

  if (!miningRes.error) {
    total += (miningRes.data ?? []).reduce((sum, row) => sum + Math.max(0, Number(row.investment ?? 0)), 0);
  }

  if (!memeRes.error) {
    total += (memeRes.data ?? []).reduce((sum, row) => {
      const status = String(row.status ?? "").toLowerCase();
      if (status === "rejected" || status === "cancelled") return sum;
      return sum + Number(row.quantity ?? 0) * Number(row.price_usd ?? 0);
    }, 0);
  }

  return money(total);
}

function parseWalletSplit(raw: unknown): WalletSplit | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const cash = Number(d.cash);
  const deposit = Number(d.deposit);
  const profit = Number(d.profit);
  if (![cash, deposit, profit].every(Number.isFinite)) return null;
  return {
    cash: money(cash),
    deposit: money(deposit),
    profit: money(profit),
    credits: money(Number(d.credits ?? 0)),
    userDeposits: money(Number(d.userDeposits ?? 0)),
    buySpend: money(Number(d.buySpend ?? 0)),
  };
}

export async function getWalletSplit(
  supabase: SupabaseClient,
  userId: string
): Promise<WalletSplit> {
  const split = await supabase.rpc("user_wallet_split", { p_user_id: userId });
  const fromRpc = !split.error ? parseWalletSplit(split.data) : null;
  if (fromRpc) return fromRpc;

  const [cash, lifetime, rpcDeposit, credits, rpcSpend, userDeposits, clientSpend] =
    await Promise.all([
      getUsdBalance(supabase, userId),
      getLifetimeProfit(supabase, userId),
      rpcMoney(supabase, "user_deposit_balance", userId),
      getDepositCredits(supabase, userId),
      rpcMoney(supabase, "user_deposit_spend", userId),
      getApprovedDepositTotal(supabase, userId),
      getDepositSpend(supabase, userId),
    ]);

  const buySpend = rpcSpend ?? clientSpend;
  const deposit =
    rpcDeposit ?? depositOnAccount(cash, lifetime, credits, userDeposits, buySpend);
  const profit = profitFromCashAndDeposit(lifetime, cash, deposit);

  return { cash, credits, userDeposits, buySpend, deposit, profit };
}

/** Browser: same deposit/profit as Admin → Users (server reads the ledger). */
export async function fetchViewerWalletSplit(): Promise<WalletSplit | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/wallet/split", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<WalletSplit>;
    if (typeof data.deposit !== "number" || typeof data.cash !== "number") return null;
    return {
      cash: money(data.cash),
      profit: money(data.profit ?? 0),
      deposit: money(data.deposit),
      credits: money(data.credits ?? 0),
      userDeposits: money(data.userDeposits ?? 0),
      buySpend: money(data.buySpend ?? 0),
    };
  } catch {
    return null;
  }
}

export async function viewerDepositBalance(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const wallet = await fetchViewerWalletSplit();
  if (wallet) return wallet.deposit;
  return getDepositBalance(supabase, userId);
}

export async function getLifetimeProfit(
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

/** Profit remaining on the account after withdrawals. */
export async function getProfitTotal(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  return (await getWalletSplit(supabase, userId)).profit;
}

/** Deposit cash only — live trades cannot spend admin profit credits. */
export async function getDepositBalance(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  return (await getWalletSplit(supabase, userId)).deposit;
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
