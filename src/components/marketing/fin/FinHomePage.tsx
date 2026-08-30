"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { MarketPair } from "@/lib/market-data";
import { LIVE_PLATFORM_METRICS } from "@/lib/constants";
import { FIN_CHART_COLORS } from "@/lib/theme";
import { formatCompact, formatNumber, formatPercent, formatStatValue } from "@/lib/utils";
import { useLiveMarketPairs } from "@/hooks/useLiveMarketPairs";
import {
  FinBar,
  FinColorBars,
  FinHoverLift,
  FinProgressSegments,
  FinPulseDot,
  FinReveal,
  FinScrollStagger,
  FinStagger,
  FinStaggerItem,
} from "@/components/marketing/fin/fin-motion";
import { FinPageActions } from "@/components/marketing/fin/FinMarketingShell";
import {
  FinCtaBanner,
  FinFeaturesGrid,
  FinHero,
  FinLiveTicker,
  FinProductsGrid,
  FinSecurityBlock,
} from "@/components/marketing/fin/FinBrokerSections";
import {
  FinCommunityReviews,
  FinFaqAccordion,
  FinFrameworkBlock,
  FinPlansTeaser,
  FinReasonsGrid,
} from "@/components/marketing/fin/FinBrokerInfoSections";

const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];

function LiveMarketsDashboard({ pairs }: { pairs: MarketPair[] }) {
  const [hoverMonth, setHoverMonth] = useState<number | null>(3);
  const featured = pairs.slice(0, 6);

  const bars = useMemo(
    () =>
      MONTHS.map((label, i) => ({
        label,
        height: 35 + ((pairs[i]?.change24h ?? 0) + 10) * 2.5 + i * 6,
      })),
    [pairs]
  );

  const trafficSegments = [
    { value: 28, color: FIN_CHART_COLORS[0] },
    { value: 22, color: FIN_CHART_COLORS[1] },
    { value: 18, color: FIN_CHART_COLORS[2] },
    { value: 16, color: FIN_CHART_COLORS[3] },
    { value: 16, color: FIN_CHART_COLORS[4] },
  ];

  return (
    <section className="mt-4">
      <FinScrollStagger>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4 px-1">
          <div>
            <FinReveal delay={0}>
              <p className="fin-section-label flex items-center gap-2">
                <FinPulseDot />
                Live overview
              </p>
            </FinReveal>
            <FinReveal delay={0.08}>
              <h2 className="mt-2 text-xl font-bold text-text-primary sm:text-2xl">
                Real-time market intelligence
              </h2>
            </FinReveal>
            <FinReveal delay={0.14}>
              <FinColorBars colors={FIN_CHART_COLORS} className="mt-3" />
            </FinReveal>
          </div>
          <FinReveal delay={0.12} y={12}>
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
            >
              <FinPageActions />
            </motion.div>
          </FinReveal>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-2">
          {LIVE_PLATFORM_METRICS.map((metric) => (
            <FinStaggerItem key={metric.label} variant="scale">
              <FinHoverLift className="fin-card p-4 sm:p-5">
                <p className="text-sm text-text-secondary">{metric.label}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary sm:text-3xl">
                  {formatStatValue(metric.value, metric.decimals)}
                  {metric.suffix}
                </p>
                <span className="fin-badge mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold">
                  Live
                </span>
              </FinHoverLift>
            </FinStaggerItem>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <FinStaggerItem variant="scale">
            <FinHoverLift className="fin-panel fin-card overflow-hidden p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-text-primary sm:text-lg">Volume overview</h3>
                <span className="rounded-xl border border-border bg-bg-secondary px-3 py-1.5 text-xs text-text-secondary">
                  Last 6 months
                </span>
              </div>
              <div className="relative flex h-[200px] items-end gap-1.5 sm:h-[240px] sm:gap-2">
                {bars.map((bar, i) => (
                  <motion.div
                    key={bar.label}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.08 * i, duration: 0.4 }}
                  >
                    <FinBar
                      height={Math.min(92, bar.height)}
                      delay={0.06 * i}
                      className="w-full max-w-[40px] rounded-t-2xl bg-bg-secondary shadow-sm"
                    />
                    <motion.button
                      type="button"
                      onMouseEnter={() => setHoverMonth(i)}
                      onFocus={() => setHoverMonth(i)}
                      className="text-[10px] text-text-tertiary sm:text-[11px]"
                    >
                      {bar.label}
                    </motion.button>
                  </motion.div>
                ))}
                {hoverMonth !== null && (
                  <motion.span
                    key={hoverMonth}
                    initial={{ opacity: 0, scale: 0.85, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="fin-badge absolute left-1/2 top-4 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold shadow-md sm:left-[42%] sm:translate-x-0"
                  >
                    +{formatCompact((pairs[hoverMonth]?.price ?? 50000) / 100)}k vol
                  </motion.span>
                )}
              </div>
            </FinHoverLift>
          </FinStaggerItem>

          <FinStaggerItem variant="scale">
            <FinHoverLift className="fin-card p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-text-primary sm:text-lg">Top movers</h3>
                <Link href="/markets" className="text-xs font-medium text-text-tertiary hover:text-text-primary sm:text-sm">
                  View all
                </Link>
              </div>
              <FinProgressSegments segments={trafficSegments} />
              <FinScrollStagger className="mt-5 space-y-2 sm:space-y-3">
                {featured.map((pair, i) => (
                  <FinStaggerItem key={pair.symbol} variant="slide">
                    <motion.div
                      whileHover={{ x: 4, scale: 1.01 }}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg-primary px-3 py-2.5 sm:px-4 sm:py-3"
                    >
                      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        <motion.span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: FIN_CHART_COLORS[i % FIN_CHART_COLORS.length] }}
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-text-primary">{pair.symbol}</p>
                          <p className="truncate text-[11px] text-text-tertiary">{pair.name}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <motion.p
                          key={pair.price}
                          initial={{ opacity: 0.6 }}
                          animate={{ opacity: 1 }}
                          className="font-mono text-sm font-semibold tabular-nums text-text-primary"
                        >
                          ${formatNumber(pair.price, pair.price < 10 ? 4 : 2)}
                        </motion.p>
                        <p className={pair.change24h >= 0 ? "text-xs text-green" : "text-xs text-red"}>
                          {formatPercent(pair.change24h)}
                        </p>
                      </div>
                    </motion.div>
                  </FinStaggerItem>
                ))}
              </FinScrollStagger>
            </FinHoverLift>
          </FinStaggerItem>
        </div>
      </FinScrollStagger>
    </section>
  );
}

export function FinHomePage({ pairs: initialPairs }: { pairs: MarketPair[] }) {
  const pairs = useLiveMarketPairs(initialPairs);

  return (
    <div className="mx-auto max-w-[1200px] pb-8">
      <FinStagger className="space-y-4">
        <FinStaggerItem variant="scale">
          <FinHero pairs={pairs} />
        </FinStaggerItem>
        <FinLiveTicker pairs={pairs} />
      </FinStagger>

      <LiveMarketsDashboard pairs={pairs} />
      <FinProductsGrid />
      <FinReasonsGrid />
      <FinFrameworkBlock />
      <FinPlansTeaser />
      <FinFeaturesGrid />
      <FinCommunityReviews />
      <FinFaqAccordion />
      <FinSecurityBlock />
      <FinCtaBanner />
    </div>
  );
}
