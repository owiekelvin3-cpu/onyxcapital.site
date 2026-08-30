"use client";

import { PLATFORM_STATS } from "@/lib/constants";
import { formatStatValue } from "@/lib/utils";
import { FadeUp, Stagger, StaggerItem } from "@/components/landing/motion";

function StatDisplay({
  value,
  suffix,
  label,
  decimals = 0,
}: {
  value: number;
  suffix: string;
  label: string;
  decimals?: number;
}) {
  return (
    <div className="px-4 py-6 text-center">
      <p className="font-display text-3xl font-bold tabular-nums text-gradient-brand sm:text-4xl lg:text-5xl">
        {formatStatValue(value, decimals)}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-text-tertiary">{label}</p>
    </div>
  );
}

export function StatsSection() {
  return (
    <section className="fin-page-plain relative overflow-hidden border-y border-border bg-bg-secondary/50 py-12 sm:py-16">
      <div className="pointer-events-none absolute inset-0 landing-shimmer opacity-50" aria-hidden />
      <div className="container-app relative">
        <FadeUp>
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-brand">
            Trusted globally
          </p>
          <h2 className="mb-10 text-center font-display text-2xl font-bold text-text-primary sm:text-3xl">
            Built for scale. Proven in production.
          </h2>
        </FadeUp>

        <Stagger className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {PLATFORM_STATS.map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="rounded-2xl border border-border/80 bg-bg-primary/60 backdrop-blur-sm">
                <StatDisplay
                  value={stat.value}
                  suffix={stat.suffix}
                  label={stat.label}
                  decimals={stat.value === 99.99 ? 2 : 0}
                />
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
