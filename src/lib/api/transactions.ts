import type { SupabaseClient } from "@supabase/supabase-js";
import type { TransactionItem } from "@/lib/supabase/types";
import { tradeNotional } from "@/lib/api/trading";
import { SPOT_PAIR_SYMBOLS } from "@/lib/spot-assets";
import { isSpotWalletDepositNotes } from "@/lib/spot-wallet-deposits";

export function transactionStatusTone(status: string): "default" | "up" | "down" | "pending" {
  const normalized = status.toLowerCase();
  if (["completed", "approved", "filled", "executed"].includes(normalized)) return "up";
  if (["rejected", "failed", "cancelled", "canceled"].includes(normalized)) return "down";
  if (["pending", "processing", "review"].includes(normalized)) return "pending";
  return "default";
}

export function isSpotTransaction(item: TransactionItem): boolean {
  if (item.kind === "trade") {
    return Boolean(item.asset && SPOT_PAIR_SYMBOLS.has(item.asset));
  }

  if (item.kind === "deposit") {
    return isSpotWalletDepositNotes(item.notes);
  }

  if (item.kind === "withdrawal") {
    return Boolean(item.notes?.includes("spot_holding_withdrawal"));
  }

  return false;
}

export function filterSpotTransactions(items: TransactionItem[]): TransactionItem[] {
  return items.filter(isSpotTransaction);
}

export function countPendingTransactions(items: TransactionItem[]): number {
  return items.filter((item) => transactionStatusTone(item.status) === "pending").length;
}

export async function getUserTransactions(
  supabase: SupabaseClient,
  userId: string,
  limitPerKind = 50
): Promise<TransactionItem[]> {
  const [depositsRes, withdrawalsRes, tradesRes] = await Promise.all([
    supabase
      .from("deposits")
      .select("id, amount, currency, method, status, notes, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limitPerKind),
    supabase
      .from("withdrawals")
      .select(
        "id, amount, currency, method, wallet_address, status, notes, created_at, updated_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limitPerKind),
    supabase
      .from("trades")
      .select("id, asset, type, amount, price, status, profit, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limitPerKind),
  ]);

  if (depositsRes.error) throw new Error(depositsRes.error.message);
  if (withdrawalsRes.error) throw new Error(withdrawalsRes.error.message);
  if (tradesRes.error) throw new Error(tradesRes.error.message);

  const deposits: TransactionItem[] = (depositsRes.data ?? []).map((row) => ({
    id: row.id,
    kind: "deposit",
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    amount: Number(row.amount),
    currency: row.currency,
    method: row.method,
    notes: row.notes,
  }));

  const withdrawals: TransactionItem[] = (withdrawalsRes.data ?? []).map((row) => ({
    id: row.id,
    kind: "withdrawal",
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    amount: Number(row.amount),
    currency: row.currency,
    method: row.method,
    destination: row.wallet_address,
    notes: row.notes,
  }));

  const trades: TransactionItem[] = (tradesRes.data ?? []).map((row) => ({
    id: row.id,
    kind: "trade",
    status: row.status,
    created_at: row.created_at,
    updated_at: row.created_at,
    amount: tradeNotional({ amount: Number(row.amount), price: Number(row.price) }),
    currency: "USD",
    asset: row.asset,
    tradeType: row.type,
    quantity: Number(row.amount),
    unitPrice: Number(row.price),
  }));

  return [...deposits, ...withdrawals, ...trades].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
