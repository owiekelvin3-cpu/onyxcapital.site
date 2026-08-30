import type { AiSubscriptionRow } from "@/lib/supabase/types";

export type LiveProfitInput = Pick<
  AiSubscriptionRow,
  | "allocation"
  | "profit_earned"
  | "entry_price"
  | "last_mark_price"
  | "admin_pnl"
  | "last_sync_at"
  | "created_at"
  | "status"
  | "expires_at"
  | "duration_hours"
  | "crypto_asset"
  | "bot_id"
  | "bot_name"
  | "id"
>;

export function computeMarketPnL(
  allocation: number,
  entryPrice: number,
  markPrice: number
): number {
  if (!Number.isFinite(allocation) || !Number.isFinite(entryPrice) || !Number.isFinite(markPrice))
    return 0;
  if (allocation <= 0 || entryPrice <= 0 || markPrice <= 0) return 0;
  return Math.round(allocation * ((markPrice - entryPrice) / entryPrice) * 100) / 100;
}

export function computeLiveProfit(
  sub: LiveProfitInput | AiSubscriptionRow,
  markPrice?: number | null
): number {
  const admin = Number(sub.admin_pnl ?? 0);
  const entry = Number(sub.entry_price ?? 0);
  const mark = Number(
    markPrice && markPrice > 0
      ? markPrice
      : sub.last_mark_price && Number(sub.last_mark_price) > 0
        ? sub.last_mark_price
        : 0
  );

  if (entry > 0 && mark > 0) {
    return Math.round((computeMarketPnL(sub.allocation, entry, mark) + admin) * 100) / 100;
  }

  return Math.round(Number(sub.profit_earned ?? 0) * 100) / 100;
}

export function getRunProgress(sub: LiveProfitInput | AiSubscriptionRow, at = Date.now()): number {
  if (!sub.expires_at) return 0;
  const start = new Date(sub.created_at).getTime();
  const end = new Date(sub.expires_at).getTime();
  const total = end - start;
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, ((at - start) / total) * 100));
}

export function getTimeRemaining(expiresAt: string): {
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
} {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { hours, minutes, seconds, expired: false };
}

export function formatCountdown(expiresAt: string): string {
  const { hours, minutes, seconds, expired } = getTimeRemaining(expiresAt);
  if (expired) return "00:00:00";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
