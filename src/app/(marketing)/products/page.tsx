import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { GetStarted } from "@/components/landing/GetStarted";

export const metadata = {
  title: "Products",
  description: "Futures, copy trading, and AI bots on Onyx Capital.",
};

export default function ProductsPage() {
  return (
    <MarketingPageShell
      title="Products built for every trader"
      subtitle="From copy trading to automated strategies — Onyx Capital gives you professional tools without the complexity."
      ctaHref="/register"
    >
      <ProductShowcase />
      <GetStarted />
    </MarketingPageShell>
  );
}
