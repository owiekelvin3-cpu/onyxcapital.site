import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getRecentTrades,
  getPortfolioSummary,
  getPendingTradesCount,
  getWalletSplit,
  type WalletSplit,
} from "@/lib/api/trading";
import { getCachedLiveMarketPairs } from "@/lib/live-prices";
import { chartFromTrades } from "@/lib/chart-data";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { isKycApproved } from "@/lib/kyc";
import { activeSignalPlanFromPackages, resolveDisplaySignalPct } from "@/lib/signal-plans";
import type { SignalPackageRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const EMPTY_WALLET: WalletSplit = {
  cash: 0,
  profit: 0,
  deposit: 0,
  credits: 0,
  userDeposits: 0,
  buySpend: 0,
};

async function walletForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<WalletSplit> {
  try {
    return await getWalletSplit(createServiceClient(), userId);
  } catch {
    try {
      return await getWalletSplit(supabase, userId);
    } catch {
      return EMPTY_WALLET;
    }
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, avatar_url, signal_pct, kyc_status")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const emptySummary = {
    cashBalance: 0,
    holdingsValue: 0,
    totalValue: 0,
    holdingsCount: 0,
    currency: "USD",
    totalDeposits: 0,
    totalWithdrawals: 0,
  };

  const [summary, recentTrades, openOrders, wallet, marketPairs, tradesCount, packagesRes] =
    await Promise.all([
      user ? getPortfolioSummary(supabase, user.id).catch(() => emptySummary) : emptySummary,
      user ? getRecentTrades(supabase, user.id, 5).catch(() => []) : [],
      user ? getPendingTradesCount(supabase, user.id).catch(() => 0) : 0,
      user ? walletForUser(supabase, user.id) : EMPTY_WALLET,
      getCachedLiveMarketPairs(),
      user
        ? Promise.resolve(
            supabase
              .from("trades")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id)
          )
            .then(({ count }) => count ?? 0)
            .catch(() => 0)
        : 0,
      user
        ? Promise.resolve(
            supabase
              .from("signal_packages")
              .select("package_id, package_name, status, expires_at")
              .eq("user_id", user.id)
          ).catch(() => ({ data: [] as SignalPackageRow[] }))
        : { data: [] as SignalPackageRow[] },
    ]);

  const portfolio = {
    ...summary,
    cashBalance: wallet.cash,
    totalValue: wallet.cash,
  };
  const chartData = chartFromTrades(portfolio.totalValue, recentTrades);
  const displayName = profile?.full_name?.trim() ?? user?.email?.split("@")[0] ?? "";
  const signalPlan = activeSignalPlanFromPackages(
    (packagesRes.data ?? []) as Pick<
      SignalPackageRow,
      "package_id" | "package_name" | "status" | "expires_at"
    >[]
  );

  return (
    <DashboardOverview
      displayName={displayName}
      userEmail={user?.email}
      avatarUrl={profile?.avatar_url ?? undefined}
      summary={portfolio}
      profitTotal={wallet.profit}
      depositBalance={wallet.deposit}
      openOrders={openOrders}
      tradesCount={tradesCount}
      chartData={chartData}
      recentTrades={recentTrades}
      marketPairs={marketPairs}
      signalPct={resolveDisplaySignalPct(Number(profile?.signal_pct ?? 0), signalPlan?.id)}
      signalPlanName={signalPlan?.name}
      signalExpiresAt={signalPlan?.expiresAt}
      kycVerified={isKycApproved(profile)}
    />
  );
}
