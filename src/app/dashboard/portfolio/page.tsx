import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getPortfolioSummary,
  getRecentTrades,
  getWalletSplit,
} from "@/lib/api/trading";
import { chartFromTrades } from "@/lib/chart-data";
import { DeckoPortfolio } from "@/components/dashboard/decko/DeckoPortfolio";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  const [summary, trades, wallet] = await Promise.all([
    getPortfolioSummary(supabase, user.id),
    getRecentTrades(supabase, user.id, 50),
    (async () => {
      try {
        return await getWalletSplit(createServiceClient(), user.id);
      } catch {
        return getWalletSplit(supabase, user.id);
      }
    })(),
  ]);

  const portfolio = {
    ...summary,
    cashBalance: wallet.cash,
    totalValue: wallet.cash,
  };
  const chartData = chartFromTrades(portfolio.totalValue, trades);
  const recentTrades = trades.slice(0, 5);

  return (
    <DeckoPortfolio
      summary={portfolio}
      profitTotal={wallet.profit}
      chartData={chartData}
      recentTrades={recentTrades}
    />
  );
}

