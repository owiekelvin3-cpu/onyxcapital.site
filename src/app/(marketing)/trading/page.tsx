import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import { SecuritySection } from "@/components/landing/SecuritySection";
import Link from "next/link";
import { PRODUCTS } from "@/lib/constants";

export const metadata = {
  title: "Trading",
  description: "Trade crypto, stocks, and forex on Onyx Capital with transparent fees.",
};

export default function TradingPage() {
  return (
    <MarketingPageShell
      title="Trading and execution"
      subtitle="Fund your account, place orders, and manage risk — with the same clarity institutional desks expect."
      ctaHref="/dashboard/deposit"
      ctaLabel="Fund account"
    >
      <section className="fin-page-plain py-8 sm:py-12">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-text-primary sm:text-xl">Trade directly on Onyx Capital</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PRODUCTS.map((product) => (
            <Link
              key={product.title}
              href={product.href}
              className="rounded-xl border border-border bg-bg-secondary p-5 transition-colors hover:border-brand/40"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">Featured</p>
              <h3 className="mt-2 text-base font-semibold text-text-primary">{product.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-tertiary">{product.desc}</p>
              <span className="mt-4 inline-block text-sm font-medium text-brand">{product.cta} →</span>
            </Link>
          ))}
        </div>
      </section>
      <SecuritySection />
    </MarketingPageShell>
  );
}
