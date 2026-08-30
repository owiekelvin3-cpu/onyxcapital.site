import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import Link from "next/link";

const IDEAS = [
  {
    title: "BTC breakout above key resistance",
    author: "Onyx Capital Desk",
    tag: "Crypto",
    excerpt: "Bitcoin reclaimed the weekly structure with strong volume — watch the retest zone for continuation.",
  },
  {
    title: "Copy trading: top performer this week",
    author: "Community",
    tag: "Copy",
    excerpt: "Mirror verified traders with one click. Set allocation limits and pause anytime.",
  },
  {
    title: "EUR/USD range setup into NFP",
    author: "FX Team",
    tag: "Forex",
    excerpt: "Price compressing inside a symmetrical triangle ahead of major economic releases.",
  },
  {
    title: "AI bot performance snapshot",
    author: "Automation",
    tag: "AI",
    excerpt: "Running strategies with transparent P&L and risk controls — backtested before deployment.",
  },
];

export const metadata = {
  title: "Community",
  description: "Trading ideas, copy trading, and community insights on Onyx Capital.",
};

export default function CommunityPage() {
  return (
    <MarketingPageShell
      title="Community ideas"
      subtitle="Follow strategies, share insights, and learn from traders worldwide — the social layer of Onyx Capital."
      ctaHref="/dashboard/copy-trading"
      ctaLabel="Browse copy trading"
    >
      <section className="fin-page-plain py-8 sm:py-12">
        <div className="mb-8 rounded-2xl border border-border bg-bg-secondary p-5 sm:p-6">
          <h2 className="text-lg font-bold text-text-primary">How copy trading works</h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            Select the experts you want to follow. After you sign up, Onyx Capital copies their trades
            automatically — no codes and no manual signal entry. When an expert opens or exits a
            position, your account mirrors it at your allocation. Keep enough free balance to cover
            minimum order size (about $10 per trade). Pause, change allocation, or follow new
            experts anytime.
          </p>
        </div>
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-text-primary sm:text-xl">Editor&apos;s picks</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/dashboard/copy-trading" className="text-brand hover:underline">
              See all ideas
            </Link>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {IDEAS.map((idea) => (
            <article
              key={idea.title}
              className="rounded-xl border border-border bg-bg-secondary p-5 transition-colors hover:border-brand/30"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-brand">
                {idea.tag}
              </span>
              <h3 className="mt-2 text-base font-semibold text-text-primary sm:text-lg">{idea.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{idea.excerpt}</p>
              <p className="mt-3 text-xs text-text-tertiary">by {idea.author}</p>
            </article>
          ))}
        </div>
      </section>
      <TestimonialsSection />
    </MarketingPageShell>
  );
}
