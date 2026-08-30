import type { PortfolioSummary } from "@/lib/api/trading";
import type { ChartPoint } from "@/lib/chart-data";
import type { MarketPair } from "@/lib/market-data";
import type { TradeRow } from "@/lib/supabase/types";
import { DeckoDashboardOverview } from "@/components/dashboard/decko/DeckoDashboardOverview";

type Props = {
  displayName: string;
  userEmail?: string;
  avatarUrl?: string;
  summary: PortfolioSummary;
  profitTotal: number;
  openOrders: number;
  tradesCount: number;
  chartData: ChartPoint[];
  recentTrades: TradeRow[];
  marketPairs: MarketPair[];
  signalPct?: number;
};

export function DashboardOverview(props: Props) {
  return <DeckoDashboardOverview {...props} />;
}
