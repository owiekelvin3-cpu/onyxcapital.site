"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Mail, ArrowRight } from "@/components/icons";
import { MARKET_PAIRS, type MarketPair } from "@/lib/market-data";
import { formatNumber, formatPercent } from "@/lib/utils";
import { HeroEnter } from "@/components/landing/motion";

const CHART_LINE =
  "M0,160 L30,155 L60,140 L90,145 L120,120 L150,110 L180,125 L210,90 L240,95 L270,70 L300,80 L330,55 L360,60 L390,40 L420,50 L450,30 L480,35 L510,20 L540,25 L570,10 L600,15";
const CHART_FILL = `${CHART_LINE} L600,200 L0,200 Z`;

const ORDER_ROWS = [
  { price: "97,238", qty: "0.452", side: "sell" as const },
  { price: "97,236", qty: "1.203", side: "sell" as const },
  { price: "97,234", qty: "0.891", side: "sell" as const },
  { price: "97,232", qty: "2.104", side: "buy" as const },
  { price: "97,230", qty: "0.567", side: "buy" as const },
];

export function Hero({ pairs = MARKET_PAIRS }: { pairs?: MarketPair[] }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const reduce = useReducedMotion();
  const featured = pairs.slice(0, 5);
  const btc = pairs.find((p) => p.symbol === "BTC/USDT") ?? featured[0];

  return (
    <section className="relative overflow-hidden bg-bg-primary">
      <div className="landing-hero-glow pointer-events-none" aria-hidden />
      <div className="landing-hero-grid pointer-events-none" aria-hidden />

      <div className="container-app relative pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-16 lg:pb-20">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
          <div className="min-w-0">
            <HeroEnter delay={0}>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-secondary border border-border text-[11px] sm:text-xs text-text-secondary mb-4 sm:mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="landing-pulse-ring absolute inline-flex h-full w-full rounded-full bg-green opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green" />
                </span>
                Markets live · fees shown upfront
              </span>
            </HeroEnter>

            <HeroEnter delay={0.08}>
              <h1 className="font-display text-[28px] xs:text-[32px] sm:text-[42px] lg:text-[52px] font-bold leading-[1.08] tracking-tight text-text-primary text-balance">
                {t("hero.title1")}{" "}
                <span className="text-gradient-brand">{t("hero.title2")}</span>
              </h1>
            </HeroEnter>

            <HeroEnter delay={0.16}>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-text-secondary leading-relaxed max-w-md">
                {t("hero.subtitle")}
              </p>
            </HeroEnter>

            <HeroEnter delay={0.24}>
              <div className="mt-6 sm:mt-8 w-full max-w-md">
                <div className="rounded-2xl border border-border bg-bg-secondary p-3.5 shadow-[var(--shadow-card)] sm:p-0 sm:bg-transparent sm:border-0 sm:shadow-none sm:rounded-none">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-3 sm:hidden">
                    Start trading today
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
                    <div className="relative flex-1 min-w-0">
                      <label htmlFor="hero-email" className="sr-only">
                        Email address
                      </label>
                      <Mail
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary"
                        aria-hidden
                      />
                      <input
                        id="hero-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-12 sm:h-12 pl-11 pr-4 bg-bg-primary sm:bg-bg-secondary border border-border rounded-lg sm:rounded text-[15px] sm:text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all min-w-0"
                      />
                    </div>

                    <Link
                      href={`/register${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                      className="w-full sm:w-auto shrink-0"
                    >
                      <Button size="lg" className="w-full sm:w-auto h-12 px-6 text-[15px] sm:text-sm">
                        {t("common.getStarted")}
                        <ArrowRight className="w-4 h-4 sm:hidden" aria-hidden />
                      </Button>
                    </Link>
                  </div>

                  <p className="mt-3 text-[12px] leading-relaxed text-text-tertiary text-center sm:text-left sm:mt-2.5">
                    Free account · No credit card · Ready in minutes
                  </p>
                </div>
              </div>
            </HeroEnter>

            <HeroEnter delay={0.32}>
              <div className="mt-8 sm:mt-10 scroll-x -mx-[var(--page-inline-pad)] px-[var(--page-inline-pad)] sm:mx-0 sm:px-0">
                <div className="flex xs:grid xs:grid-cols-2 xs:flex-none gap-x-5 sm:gap-x-8 gap-y-3 min-w-max xs:min-w-0 pr-4 xs:pr-0">
                {featured.map((p, i) => (
                  <motion.div
                    key={p.symbol}
                    className="flex items-baseline gap-1.5 sm:gap-2 min-w-0"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.06, duration: 0.4 }}
                  >
                    <span className="text-[11px] sm:text-xs text-text-tertiary shrink-0">
                      {p.symbol.split("/")[0]}
                    </span>
                    <span className="text-xs sm:text-sm font-medium font-mono truncate">
                      ${formatNumber(p.price, p.price < 10 ? 4 : 2)}
                    </span>
                    <span
                      className={`text-[11px] sm:text-xs font-mono shrink-0 ${p.change24h >= 0 ? "text-green" : "text-red"}`}
                    >
                      {formatPercent(p.change24h)}
                    </span>
                  </motion.div>
                ))}
                </div>
              </div>
            </HeroEnter>
          </div>

          <HeroEnter delay={0.2} className="relative min-w-0 w-full max-w-xl lg:max-w-none mx-auto lg:mx-0">
            <div className="landing-terminal-float relative">
              <div className="absolute -inset-px rounded-lg bg-gradient-to-br from-brand/20 via-transparent to-green/10 opacity-60 blur-sm pointer-events-none" />
              <div className="relative bg-bg-secondary border border-border rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 px-3 sm:px-4 py-3 border-b border-border">
                  <div className="flex flex-wrap items-center gap-x-2 sm:gap-3 gap-y-1 min-w-0">
                    <span className="text-xs sm:text-sm font-semibold">BTC/USDT</span>
                    <motion.span
                      key={btc.price}
                      className="text-base sm:text-lg font-bold font-mono text-green"
                      initial={reduce ? false : { opacity: 0.6 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25 }}
                    >
                      ${formatNumber(btc.price, 2)}
                    </motion.span>
                    <span
                      className={`text-[11px] sm:text-xs font-mono ${btc.change24h >= 0 ? "text-green" : "text-red"}`}
                    >
                      {formatPercent(btc.change24h)}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {["1H", "4H", "1D", "1W"].map((t) => (
                      <span
                        key={t}
                        className={`px-2 py-1 text-[10px] rounded cursor-default flex items-center justify-center transition-colors ${
                          t === "1D"
                            ? "bg-brand/15 text-brand"
                            : "text-text-tertiary hover:text-text-secondary"
                        }`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="h-[160px] sm:h-[200px] lg:h-[220px] relative px-2 pt-2 overflow-hidden">
                  <div className="absolute inset-0 landing-chart-scan pointer-events-none" aria-hidden />
                  <svg
                    viewBox="0 0 600 200"
                    className="w-full h-full"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22C55E" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="chartStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#22C55E" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="#22C55E" />
                        <stop offset="100%" stopColor="#6B4AE3" stopOpacity="0.8" />
                      </linearGradient>
                    </defs>
                    <motion.path
                      d={CHART_FILL}
                      fill="url(#chartFill)"
                      initial={reduce ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.5 }}
                    />
                    <motion.path
                      d={CHART_LINE}
                      fill="none"
                      stroke="url(#chartStroke)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      initial={reduce ? false : { pathLength: 0, opacity: 0.5 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 1.4, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </svg>
                  <motion.div
                    className="absolute top-4 right-4 w-2 h-2 rounded-full bg-green shadow-[0_0_12px_rgba(34,197,94,0.6)]"
                    animate={reduce ? undefined : { scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-border">
                  <div className="p-3 sm:border-r border-border border-b sm:border-b-0">
                    <p className="text-[10px] text-text-tertiary mb-2 uppercase tracking-wider">
                      Order book
                    </p>
                    {ORDER_ROWS.map((row, i) => (
                      <motion.div
                        key={`${row.price}-${row.side}`}
                        className="relative flex justify-between text-[11px] font-mono py-0.5 overflow-hidden rounded-sm"
                        initial={reduce ? false : { opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + i * 0.07, duration: 0.35 }}
                      >
                        <span
                          className={`absolute inset-y-0 right-0 ${row.side === "sell" ? "bg-red/5" : "bg-green/5"}`}
                          style={{ width: `${30 + i * 8}%` }}
                        />
                        <span
                          className={`relative z-10 ${row.side === "sell" ? "text-red" : "text-green"}`}
                        >
                          {row.price}
                        </span>
                        <span className="relative z-10 text-text-tertiary">{row.qty}</span>
                      </motion.div>
                    ))}
                  </div>
                  <div className="p-3">
                    <div className="flex gap-1 mb-3">
                      <Link
                        href="/register"
                        className="flex-1 h-9 sm:h-7 text-xs font-semibold bg-green text-white rounded flex items-center justify-center hover:brightness-110 transition-[filter]"
                      >
                        Buy
                      </Link>
                      <Link
                        href="/register"
                        className="flex-1 h-9 sm:h-7 text-xs font-semibold bg-bg-hover text-text-tertiary rounded flex items-center justify-center hover:text-text-secondary transition-colors"
                      >
                        Sell
                      </Link>
                    </div>
                    <div className="space-y-2">
                      <div className="h-9 sm:h-7 bg-bg-primary border border-border rounded px-2 flex items-center text-[11px] text-text-tertiary">
                        Market
                      </div>
                      <div className="h-9 sm:h-7 bg-bg-primary border border-border rounded px-2 flex items-center text-[11px] text-text-tertiary">
                        Amount (BTC)
                      </div>
                      <Link
                        href="/register"
                        className="w-full h-10 sm:h-8 bg-green text-white text-xs font-semibold rounded flex items-center justify-center hover:brightness-110 transition-[filter]"
                      >
                        Buy BTC
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </HeroEnter>
        </div>
      </div>
    </section>
  );
}
