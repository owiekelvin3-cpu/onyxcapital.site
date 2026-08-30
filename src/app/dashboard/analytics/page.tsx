import { getCachedLiveMarketPairs } from "@/lib/live-prices";
import { DeckoMarketAnalytics } from "@/components/dashboard/decko/DeckoMarketAnalytics";

export default async function MarketAnalyticsPage() {
  const marketPairs = await getCachedLiveMarketPairs();
  const updatedAt = new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return <DeckoMarketAnalytics marketPairs={marketPairs} updatedAt={updatedAt} />;
}
