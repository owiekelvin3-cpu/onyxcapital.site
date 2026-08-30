"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { MarketPair } from "@/lib/market-data";
import {
  BRAND,
  PLATFORM_STATS,
  PREMIUM_FEATURES,
  PRODUCTS,
  SECURITY_FEATURES,
} from "@/lib/constants";
import { FinHeroTerminal } from "@/components/marketing/fin/FinHeroTerminal";
import { formatNumber, formatPercent, formatStatValue } from "@/lib/utils";
import {
  FinGlow,
  FinHoverLift,
  FinPulseDot,
  FinScrollStagger,
  FinStagger,
  FinStaggerItem,
} from "@/components/marketing/fin/fin-motion";
import {
  ArrowRight,
  Bot,
  CircleCheck,
  Copy,
  LineChart,
  Shield,
  TrendingUp,
} from "@/components/icons";

const PRODUCT_ICONS = [LineChart, TrendingUp, Copy, Bot] as const;

function HeroStat({
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
    <div className="rounded-xl border border-border bg-bg-primary/80 px-3 py-3 text-center sm:px-4 sm:py-4">
      <p className="text-lg font-bold tabular-nums text-text-primary sm:text-xl">
        {formatStatValue(value, decimals)}
        {suffix}
      </p>
      <p className="mt-1 text-[10px] text-text-tertiary sm:text-[11px]">{label}</p>
    </div>
  );
}

export function FinHero({ pairs }: { pairs: MarketPair[] }) {
  return (
    <div className="fin-card relative overflow-hidden p-5 sm:p-8 lg:p-10">
      <FinGlow className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full" />
      <FinStagger className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <FinStaggerItem>
            <p className="fin-section-label mb-3 flex items-center gap-2">
              <FinPulseDot />
              Onyx Capital · Live markets
            </p>
          </FinStaggerItem>
          <FinStaggerItem>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-[46px] lg:leading-[1.08]">
              Trade confidently and{" "}
              <motion.span
                className="text-brand"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                securely
              </motion.span>
            </h1>
          </FinStaggerItem>
          <FinStaggerItem>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-text-secondary sm:text-base">
              Learn proven strategies from top industry experts to grow your capital. Crypto, stocks,
              and forex on one desk — with 0.10% spot fees and sub-10ms execution.
            </p>
          </FinStaggerItem>
          <FinStaggerItem>
            <div className="mt-6 flex flex-wrap gap-3">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/register"
                  className="fin-btn-primary inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold"
                >
                  Open free account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/markets"
                  className="inline-flex h-11 items-center rounded-full border border-border px-6 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover"
                >
                  Explore markets
                </Link>
              </motion.div>
            </div>
          </FinStaggerItem>
          <FinStagger>
            <div className="mt-6 flex flex-wrap gap-2">
              {["1M+ participants", "0.10% spot fees", "24/7 support"].map((tag) => (
                <FinStaggerItem key={tag} variant="scale">
                  <motion.span
                    whileHover={{ y: -2 }}
                    className="inline-block rounded-full border border-border bg-bg-primary px-3 py-1 text-xs font-medium text-text-secondary"
                  >
                    {tag}
                  </motion.span>
                </FinStaggerItem>
              ))}
            </div>
          </FinStagger>
        </div>
        <FinStaggerItem variant="scale">
          <FinHeroTerminal pairs={pairs} />
        </FinStaggerItem>
      </FinStagger>

      <div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:mt-8">
        {PLATFORM_STATS.map((stat) => (
          <HeroStat
            key={stat.label}
            value={stat.value}
            suffix={stat.suffix}
            label={stat.label}
            decimals={stat.value === 99.99 ? 2 : 0}
          />
        ))}
      </div>
    </div>
  );
}

export function FinLiveTicker({ pairs }: { pairs: MarketPair[] }) {
  const ticker = pairs.slice(0, 10);
  const items = [...ticker, ...ticker];

  return (
    <FinStaggerItem>
      <FinHoverLift className="fin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <FinPulseDot />
            Live market prices
          </p>
          <Link href="/markets" className="text-xs font-medium text-text-tertiary hover:text-text-primary">
            Full market view →
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="relative overflow-hidden py-2"
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-bg-secondary to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-bg-secondary to-transparent" />
          <div className="flex marquee-track whitespace-nowrap">
            {items.map((pair, i) => (
              <motion.div
                key={`${pair.symbol}-${i}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + (i % 10) * 0.04 }}
                className="inline-flex items-center gap-2 px-5 text-xs"
              >
                <span className="font-semibold text-text-primary">{pair.symbol}</span>
                <span className="font-mono text-text-secondary tabular-nums">
                  ${formatNumber(pair.price, pair.price < 10 ? 4 : 2)}
                </span>
                <span className={`font-mono tabular-nums ${pair.change24h >= 0 ? "text-green" : "text-red"}`}>
                  {formatPercent(pair.change24h)}
                </span>
                <span className="text-border-light mx-1">·</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </FinHoverLift>
    </FinStaggerItem>
  );
}

export function FinProductsGrid() {
  return (
    <section className="mt-4">
      <FinScrollStagger>
        <FinStaggerItem>
          <div className="mb-4 flex items-end justify-between gap-4 px-1">
            <div>
              <p className="fin-section-label">Trading products</p>
              <h2 className="mt-2 text-xl font-bold text-text-primary sm:text-2xl">
                Every asset class, one broker account
              </h2>
            </div>
            <Link href="/products" className="hidden text-sm font-medium text-text-tertiary hover:text-text-primary sm:block">
              All products →
            </Link>
          </div>
        </FinStaggerItem>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRODUCTS.map((product, i) => {
            const Icon = PRODUCT_ICONS[i];
            return (
              <FinStaggerItem key={product.title} variant="scale">
                <Link href={product.href} className="group block">
                  <FinHoverLift className="fin-card h-full p-5 sm:p-6">
                    <motion.span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg-primary text-brand"
                      whileHover={{ rotate: 8, scale: 1.08 }}
                      transition={{ type: "spring", stiffness: 400, damping: 18 }}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </motion.span>
                    <h3 className="mt-4 text-base font-bold text-text-primary group-hover:text-brand">
                      {product.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">{product.desc}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand">
                      {product.cta}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </FinHoverLift>
                </Link>
              </FinStaggerItem>
            );
          })}
        </div>
      </FinScrollStagger>
    </section>
  );
}

export function FinFeaturesGrid() {
  return (
    <section className="mt-4">
      <FinScrollStagger>
        <FinStaggerItem>
          <div className="mb-4 px-1">
            <p className="fin-section-label">Why Onyx Capital</p>
            <h2 className="mt-2 text-xl font-bold text-text-primary sm:text-2xl">
              Professional infrastructure for every trader
            </h2>
          </div>
        </FinStaggerItem>
        <div className="grid gap-3 sm:grid-cols-2">
          {PREMIUM_FEATURES.slice(0, 4).map((feature) => (
            <FinStaggerItem key={feature.title} variant="scale">
              <FinHoverLift className="fin-card h-full p-5 sm:p-6">
                <motion.span
                  className="rounded-full bg-brand-light px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand"
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                >
                  {feature.tag}
                </motion.span>
                <h3 className="mt-3 text-base font-bold text-text-primary">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{feature.desc}</p>
              </FinHoverLift>
            </FinStaggerItem>
          ))}
        </div>
      </FinScrollStagger>
    </section>
  );
}

export function FinSecurityBlock() {
  return (
    <section className="mt-4">
      <FinScrollStagger className="grid gap-4 lg:grid-cols-2">
        <FinStaggerItem>
          <FinHoverLift className="fin-card p-6 sm:p-8">
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-border bg-brand-light px-3 py-1.5 text-xs font-medium text-brand"
              whileHover={{ scale: 1.03 }}
            >
              <Shield className="h-3.5 w-3.5" />
              Enterprise security
            </motion.div>
            <h2 className="mt-4 text-xl font-bold text-text-primary sm:text-2xl">
              Your capital protected at every layer
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Cold storage, multi-sig withdrawals, and real-time fraud monitoring — the same standards
              institutional desks expect from a prime broker.
            </p>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="mt-6 inline-block">
              <Link
                href="/register"
                className="fin-btn-primary inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold"
              >
                Create secure account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </FinHoverLift>
        </FinStaggerItem>
        <FinStaggerItem>
          <div className="fin-card p-5 sm:p-6">
            <FinScrollStagger className="grid gap-3 sm:grid-cols-2">
              {SECURITY_FEATURES.map((item) => (
                <FinStaggerItem key={item} variant="slide">
                  <motion.div
                    whileHover={{ x: 4 }}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-bg-primary p-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green/10 text-green">
                      <CircleCheck className="h-4 w-4" />
                    </span>
                    <p className="text-sm font-medium leading-snug text-text-primary">{item}</p>
                  </motion.div>
                </FinStaggerItem>
              ))}
            </FinScrollStagger>
          </div>
        </FinStaggerItem>
      </FinScrollStagger>
    </section>
  );
}

export function FinCtaBanner() {
  return (
    <section className="mt-4">
      <FinScrollStagger>
        <FinStaggerItem variant="scale">
          <FinHoverLift className="relative fin-card overflow-hidden p-6 sm:p-8 lg:p-10">
            <motion.div
              className="pointer-events-none absolute inset-0 opacity-30"
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              style={{
                backgroundImage:
                  "linear-gradient(110deg, transparent 30%, rgba(226,255,76,0.15) 50%, transparent 70%)",
                backgroundSize: "200% 100%",
              }}
              aria-hidden
            />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">
                  Ready to trade with Onyx Capital?
                </h2>
                <p className="mt-2 max-w-lg text-sm text-text-secondary sm:text-base">
                  Join millions of traders on a broker built for speed, transparency, and control.
                  No minimum deposit. Start in under 60 seconds.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/register"
                    className="fin-btn-primary inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold"
                  >
                    Open free account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/fees"
                    className="inline-flex h-11 items-center rounded-full border border-border px-6 text-sm font-semibold text-text-primary hover:bg-bg-hover"
                  >
                    View fees
                  </Link>
                </motion.div>
              </div>
            </div>
          </FinHoverLift>
        </FinStaggerItem>
      </FinScrollStagger>
    </section>
  );
}
