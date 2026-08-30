import type { TradeRow } from "@/lib/supabase/types";

export interface ChartPoint {
  date: string;
  price: number;
}

/** Flat history at current balance — honest when no trade timeline exists */
export function buildPortfolioChartData(balance: number, days = 30): ChartPoint[] {
  const data: ChartPoint[] = [];
  const now = Date.now();

  for (let i = days; i >= 0; i--) {
    data.push({
      date: new Date(now - i * 86400000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      price: Math.round(balance * 100) / 100,
    });
  }

  return data;
}

/** Reconstruct approximate balance curve from completed trades */
export function chartFromTrades(balance: number, trades: TradeRow[]): ChartPoint[] {
  if (trades.length === 0) {
    return buildPortfolioChartData(balance);
  }

  const sorted = [...trades].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let running = balance;
  const points: ChartPoint[] = [];

  for (let i = sorted.length - 1; i >= 0; i--) {
    const t = sorted[i];
    const notional = t.amount * t.price;
    running += t.type === "buy" ? notional : -notional;

    points.unshift({
      date: new Date(t.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      price: Math.max(0, Math.round(running * 100) / 100),
    });
  }

  points.push({
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    price: Math.round(balance * 100) / 100,
  });

  return points;
}
