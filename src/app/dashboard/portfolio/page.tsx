import { createClient } from "@/lib/supabase/server";
import {
  getPortfolioSummary,
  getProfitTotal,
  getRecentTrades,
} from "@/lib/api/trading";
import { chartFromTrades } from "@/lib/chart-data";
import { DeckoPortfolio } from "@/components/dashboard/decko/DeckoPortfolio";

export default async function PortfolioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const emptySummary = {
    cashBalance: 0,
    holdingsValue: 0,
    totalValue: 0,
    holdingsCount: 0,
    currency: "USD",
    totalDeposits: 0,
    totalWithdrawals: 0,
  };

  if (!user) {
    return (
      <DeckoPortfolio
        summary={emptySummary}
        profitTotal={0}
        chartData={chartFromTrades(0, [])}
        recentTrades={[]}
      />
    );
  }

  const [summary, trades, profitTotal] = await Promise.all([
    getPortfolioSummary(supabase, user.id),
    getRecentTrades(supabase, user.id, 50),
    getProfitTotal(supabase, user.id),
  ]);

  const chartData = chartFromTrades(summary.totalValue, trades);
  const recentTrades = trades.slice(0, 5);

  return (
    <DeckoPortfolio
      summary={summary}
      profitTotal={profitTotal}
      chartData={chartData}
      recentTrades={recentTrades}
    />
  );
}
