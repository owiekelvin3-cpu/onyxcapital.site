import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import { MarketsSection } from "@/components/landing/MarketsSection";
import { MarketTicker } from "@/components/landing/MarketTicker";
import { getCachedLiveMarketPairs } from "@/lib/live-prices";

export const metadata = {
  title: "Markets",
  description: "Live market prices for crypto, stocks, forex, and more on Onyx Capital.",
};

export default async function MarketsPage() {
  const pairs = await getCachedLiveMarketPairs();

  return (
    <MarketingPageShell
      title="Markets"
      subtitle="Track all markets in one place — live prices, movers, and volume leaders updated continuously."
      ctaHref="/register"
      ctaLabel="Open markets"
    >
      <div className="fin-page-plain -mx-1 overflow-hidden rounded-2xl border border-border sm:mx-0">
        <MarketTicker pairs={pairs} />
      </div>
      <MarketsSection pairs={pairs} />
    </MarketingPageShell>
  );
}
