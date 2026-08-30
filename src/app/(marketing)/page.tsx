import { FinHomePage } from "@/components/marketing/fin/FinHomePage";
import { getCachedLiveMarketPairs } from "@/lib/live-prices";

export default async function HomePage() {
  const pairs = await getCachedLiveMarketPairs();
  return <FinHomePage pairs={pairs} />;
}
