import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import {
  MINING_PLANS,
  SIGNAL_STRENGTH_TIERS,
  STAKING_PLANS,
  TRADING_ACCOUNT_TIERS,
} from "@/lib/broker-info";
import { CircleCheck } from "@/components/icons";

export const metadata = {
  title: "Plans",
  description:
    "Trading, signals, mining, and staking plans on Onyx Capital — leverage up to 1:500, hashpower contracts, and term staking.",
};

function PlanCard({
  name,
  lines,
  highlighted,
}: {
  name: string;
  lines: string[];
  highlighted?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border p-5 ${
        highlighted ? "border-brand/50 bg-brand-light/40" : "border-border bg-bg-secondary"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">{name}</p>
      <ul className="mt-4 space-y-2">
        {lines.map((line) => (
          <li key={line} className="flex items-start gap-2 text-sm text-text-secondary">
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-green" />
            {line}
          </li>
        ))}
      </ul>
      <Link
        href="/register"
        className="mt-5 inline-flex text-sm font-semibold text-brand hover:underline"
      >
        Get started →
      </Link>
    </article>
  );
}

export default function PlansPage() {
  return (
    <MarketingPageShell
      title="Build your wealth step by step"
      subtitle="Choose a trading account tier, unlock stronger signals, rent mining hashpower, or lock a staking term. Open an account to activate a plan."
      ctaHref="/register"
      ctaLabel="Open free account"
    >
      <section className="fin-page-plain space-y-10 py-8 sm:py-12">
        <div>
          <h2 className="text-lg font-bold text-text-primary sm:text-xl">Trading accounts</h2>
          <p className="mt-1 text-sm text-text-secondary">
            No swap fees on Gold and above. Leverage from 1:10 to 1:500.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {TRADING_ACCOUNT_TIERS.map((tier) => (
              <PlanCard
                key={tier.name}
                name={tier.name}
                highlighted={"highlighted" in tier && tier.highlighted}
                lines={[tier.leverage, tier.spread, ...tier.extras]}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-text-primary sm:text-xl">Signals</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Desk alerts with defined entry, target, and stop — strength scaled by tier.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {SIGNAL_STRENGTH_TIERS.map((tier) => (
              <PlanCard
                key={tier.name}
                name={tier.name}
                highlighted={"highlighted" in tier && tier.highlighted}
                lines={[tier.strength, tier.detail]}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-text-primary sm:text-xl">Mining</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Hashpower contracts with no advertised downtime or electricity costs. First output is
            typically released after 48 hours.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {MINING_PLANS.map((plan) => (
              <PlanCard
                key={plan.name}
                name={plan.name}
                highlighted={"highlighted" in plan && plan.highlighted}
                lines={[plan.hashrate, plan.hardware, `Duration: ${plan.duration}`, ...plan.extras]}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-text-primary sm:text-xl">Staking</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Fixed-term plans. Returns are published on each term before you lock funds.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STAKING_PLANS.map((plan) => (
              <PlanCard
                key={plan.days}
                name={`${plan.days} days`}
                lines={[`${plan.returnPct}% return`, "Lock for the full term"]}
              />
            ))}
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
