"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { MarketPair } from "@/lib/market-data";
import { formatNumber, formatPercent } from "@/lib/utils";
import { FinPulseDot } from "@/components/marketing/fin/fin-motion";

const CHART_LINE =
  "M0,160 L30,155 L60,140 L90,145 L120,120 L150,110 L180,125 L210,90 L240,95 L270,70 L300,80 L330,55 L360,60 L390,40 L420,50 L450,30 L480,35 L510,20 L540,25 L570,10 L600,15";
const CHART_FILL = `${CHART_LINE} L600,200 L0,200 Z`;

function orderRows(price: number) {
  const base = Math.round(price);
  const fmt = (n: number) => n.toLocaleString("en-US");
  return [
    { price: fmt(base + 4), qty: "0.452", side: "sell" as const },
    { price: fmt(base + 2), qty: "1.203", side: "sell" as const },
    { price: fmt(base + 1), qty: "0.891", side: "sell" as const },
    { price: fmt(base), qty: "2.104", side: "buy" as const },
    { price: fmt(base - 2), qty: "0.567", side: "buy" as const },
  ];
}

export function FinHeroTerminal({ pairs }: { pairs: MarketPair[] }) {
  const reduce = useReducedMotion();
  const btc = pairs.find((p) => p.symbol === "BTC/USDT") ?? pairs[0];
  const rows = useMemo(() => orderRows(btc?.price ?? 97230), [btc?.price]);

  if (!btc) return null;

  return (
    <motion.div
      className="fin-hero-terminal relative"
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-[var(--brand-accent)]/25 via-transparent to-green/10 opacity-70 blur-sm" />
      <div className="relative overflow-hidden rounded-[1.35rem] border border-border bg-bg-primary shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-3 sm:px-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <FinPulseDot />
            <span className="text-xs font-semibold text-text-primary sm:text-sm">{btc.symbol}</span>
            <motion.span
              key={btc.price}
              className="text-base font-bold font-mono tabular-nums text-green sm:text-lg"
              initial={reduce ? false : { opacity: 0.5, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              ${formatNumber(btc.price, btc.price < 10 ? 4 : 2)}
            </motion.span>
            <span
              className={`text-[11px] font-mono tabular-nums sm:text-xs ${btc.change24h >= 0 ? "text-green" : "text-red"}`}
            >
              {formatPercent(btc.change24h)}
            </span>
          </div>
          <div className="flex shrink-0 gap-1">
            {["1H", "4H", "1D", "1W"].map((t) => (
              <span
                key={t}
                className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
                  t === "1D"
                    ? "bg-[var(--brand-accent)]/15 text-brand"
                    : "text-text-tertiary"
                }`}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="relative h-[150px] overflow-hidden px-2 pt-2 sm:h-[190px]">
          <div className="fin-hero-chart-scan pointer-events-none absolute inset-0" aria-hidden />
          <svg viewBox="0 0 600 200" className="h-full w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="finChartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--green)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="finChartStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--green)" stopOpacity="0.35" />
                <stop offset="55%" stopColor="var(--green)" />
                <stop offset="100%" stopColor="var(--brand-accent)" stopOpacity="0.85" />
              </linearGradient>
            </defs>
            <motion.path
              d={CHART_FILL}
              fill="url(#finChartFill)"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.45 }}
            />
            <motion.path
              d={CHART_LINE}
              fill="none"
              stroke="url(#finChartStroke)"
              strokeWidth="2"
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0, opacity: 0.5 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.3, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
        </div>

        <div className="grid grid-cols-1 border-t border-border sm:grid-cols-2">
          <div className="border-b border-border p-3 sm:border-b-0 sm:border-r">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              Order book
            </p>
            {rows.map((row, i) => (
              <motion.div
                key={`${row.price}-${row.side}`}
                className="relative flex justify-between overflow-hidden rounded-sm py-0.5 font-mono text-[11px]"
                initial={reduce ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.06, duration: 0.35 }}
              >
                <span
                  className={`absolute inset-y-0 right-0 ${row.side === "sell" ? "bg-red/5" : "bg-green/5"}`}
                  style={{ width: `${28 + i * 9}%` }}
                />
                <span className={`relative z-10 ${row.side === "sell" ? "text-red" : "text-green"}`}>
                  {row.price}
                </span>
                <span className="relative z-10 text-text-tertiary">{row.qty}</span>
              </motion.div>
            ))}
          </div>
          <div className="p-3">
            <div className="mb-3 flex gap-1">
              <Link
                href="/register"
                className="flex h-8 flex-1 items-center justify-center rounded-lg bg-green text-xs font-semibold text-white transition-[filter] hover:brightness-110"
              >
                Buy
              </Link>
              <Link
                href="/register"
                className="flex h-8 flex-1 items-center justify-center rounded-lg bg-bg-hover text-xs font-semibold text-text-tertiary transition-colors hover:text-text-secondary"
              >
                Sell
              </Link>
            </div>
            <div className="space-y-2">
              <div className="flex h-8 items-center rounded-lg border border-border bg-bg-secondary px-2 text-[11px] text-text-tertiary">
                Market · 0.10% fee
              </div>
              <div className="flex h-8 items-center rounded-lg border border-border bg-bg-secondary px-2 text-[11px] text-text-tertiary">
                Amount (BTC)
              </div>
              <Link
                href="/register"
                className="flex h-9 w-full items-center justify-center rounded-lg bg-[var(--fin-btn-bg)] text-xs font-semibold text-[var(--fin-btn-fg)] transition-transform hover:scale-[1.01]"
              >
                Open trade desk
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
