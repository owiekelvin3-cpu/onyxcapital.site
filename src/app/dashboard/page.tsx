import { createClient } from "@/lib/supabase/server";
import {
  getRecentTrades,
  getPortfolioSummary,
  getPendingTradesCount,
  getProfitTotal,
} from "@/lib/api/trading";
import { getCachedLiveMarketPairs } from "@/lib/live-prices";
import { chartFromTrades } from "@/lib/chart-data";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, avatar_url, signal_pct")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const [summary, recentTrades, openOrders, profitTotal, marketPairs, tradesCount] =
    await Promise.all([
      user ? getPortfolioSummary(supabase, user.id) : Promise.resolve({
        cashBalance: 0,
        holdingsValue: 0,
        totalValue: 0,
        holdingsCount: 0,
        currency: "USD",
        totalDeposits: 0,
        totalWithdrawals: 0,
      }),
      user ? getRecentTrades(supabase, user.id, 5) : Promise.resolve([]),
      user ? getPendingTradesCount(supabase, user.id) : Promise.resolve(0),
      user ? getProfitTotal(supabase, user.id) : Promise.resolve(0),
      getCachedLiveMarketPairs(),
      user
        ? supabase
            .from("trades")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .then(({ count }) => count ?? 0)
        : Promise.resolve(0),
    ]);

  const chartData = chartFromTrades(summary.totalValue, recentTrades);
  const displayName = profile?.full_name?.trim() ?? user?.email?.split("@")[0] ?? "";

  return (
    <DashboardOverview
      displayName={displayName}
      userEmail={user?.email}
      avatarUrl={profile?.avatar_url ?? undefined}
      summary={summary}
      profitTotal={profitTotal}
      openOrders={openOrders}
      tradesCount={tradesCount}
      chartData={chartData}
      recentTrades={recentTrades}
      marketPairs={marketPairs}
      signalPct={Number(profile?.signal_pct ?? 0)}
    />
  );
}
