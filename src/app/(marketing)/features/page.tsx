import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { TrustBar } from "@/components/landing/TrustBar";

export const metadata = {
  title: "Features",
  description: "Platform features — charts, analytics, security, and institutional tools on Onyx Capital.",
};

export default function FeaturesPage() {
  return (
    <MarketingPageShell
      title="Features"
      subtitle="Supercharts, smart portfolio analytics, alerts, and APIs — everything you need to trade with confidence."
      ctaHref="/register"
    >
      <TrustBar />
      <StatsSection />
      <FeaturesSection />
    </MarketingPageShell>
  );
}
