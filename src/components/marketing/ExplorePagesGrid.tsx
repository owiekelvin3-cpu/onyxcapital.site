import Link from "next/link";
import { MARKETING_PAGES } from "@/lib/marketing-nav";
import { ArrowRight } from "@/components/icons";

const PAGE_DESCRIPTIONS: Record<string, string> = {
  products: "Spot, futures, copy trading, and AI bots — all in one platform.",
  community: "Follow top traders, share ideas, and learn from the community.",
  markets: "Live prices across crypto, stocks, forex, and commodities.",
  trading: "Connect, fund, and execute trades with transparent fees.",
  features: "Charts, analytics, alerts, and institutional-grade tools.",
};

export function ExplorePagesGrid() {
  const pages = MARKETING_PAGES.filter((p) => p.href !== "/");

  return (
    <section className="py-14 sm:py-16 bg-bg-primary">
      <div className="container-app">
        <h2 className="text-[22px] sm:text-[26px] font-bold text-text-primary mb-2">
          Explore the platform
        </h2>
        <p className="text-[14px] text-text-secondary mb-8 max-w-lg">
          Each section has its own page — just like a professional trading platform should.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="group flex flex-col rounded-lg border border-border bg-bg-secondary p-5 hover:border-brand/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[16px] font-semibold text-text-primary group-hover:text-brand transition-colors">
                  {page.title}
                </h3>
                <ArrowRight className="h-4 w-4 text-text-tertiary group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="mt-2 text-[13px] text-text-tertiary leading-relaxed flex-1">
                {PAGE_DESCRIPTIONS[page.slug] ?? page.title}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
