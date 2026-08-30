"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MARKET_PAIRS, type MarketPair } from "@/lib/market-data";
import { formatCompact, formatNumber, formatPercent } from "@/lib/utils";
import { ArrowRight } from "@/components/icons";
import { FadeUp } from "@/components/landing/motion";

const TABS = ["Hot", "Gainers", "Losers", "New"] as const;

function MarketCard({ pair, rank }: { pair: MarketPair; rank: number }) {
  return (
    <Link
      href="/register"
      className="flex items-center justify-between p-3.5 bg-bg-secondary border border-border rounded-lg hover:border-border-light hover:bg-bg-hover/80 active:bg-bg-hover transition-all duration-200"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[11px] text-text-tertiary w-4 shrink-0 tabular-nums">{rank}</span>
        <div className="w-8 h-8 rounded-full bg-bg-hover flex items-center justify-center text-[10px] font-bold shrink-0 ring-1 ring-border">
          {pair.symbol.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{pair.symbol}</p>
          <p className="text-[11px] text-text-tertiary truncate">{pair.name}</p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <p className="text-sm font-mono tabular-nums">
          ${formatNumber(pair.price, pair.price < 10 ? 4 : 2)}
        </p>
        <p
          className={`text-[11px] font-mono mt-0.5 tabular-nums ${pair.change24h >= 0 ? "text-green" : "text-red"}`}
        >
          {formatPercent(pair.change24h)}
        </p>
      </div>
    </Link>
  );
}

export function MarketsSection({ pairs = MARKET_PAIRS }: { pairs?: MarketPair[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Hot");
  const reduce = useReducedMotion();

  const sorted = [...pairs].sort((a, b) => {
    if (tab === "Gainers") return b.change24h - a.change24h;
    if (tab === "Losers") return a.change24h - b.change24h;
    return b.volume24h - a.volume24h;
  });

  const displayed = sorted.slice(0, 10);

  return (
    <section id="markets" className="fin-page-plain bg-bg-primary py-12 sm:py-16 lg:py-20">
      <div className="container-app">
        <FadeUp className="flex flex-col xs:flex-row xs:items-end xs:justify-between gap-3 mb-5 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
              What&apos;s moving today
            </h2>
            <p className="text-xs sm:text-sm text-text-tertiary mt-1">
              Prices across crypto, stocks, and forex — updated on the platform
            </p>
          </div>
          <Link
            href="/register"
            className="group flex items-center gap-1 text-sm text-brand hover:text-brand-hover transition-colors w-fit"
          >
            Open markets
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </FadeUp>

        <FadeUp delay={0.08}>
          <div className="scroll-tabs flex gap-4 sm:gap-6 border-b border-border mb-4 sm:mb-0">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 text-sm font-medium transition-colors relative cursor-pointer whitespace-nowrap shrink-0 touch-target ${
                  tab === t
                    ? "text-text-primary"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                {t}
                {tab === t && (
                  <motion.span
                    layoutId="market-tab"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </FadeUp>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            <div className="md:hidden space-y-2 mt-4">
              {displayed.map((pair, i) => (
                <motion.div
                  key={pair.symbol}
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                >
                  <MarketCard pair={pair} rank={i + 1} />
                </motion.div>
              ))}
            </div>

            <div className="hidden md:block table-scroll mt-4 md:mt-0">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="text-left text-xs text-text-tertiary border-b border-border">
                    <th className="py-3 pr-4 font-normal w-8">#</th>
                    <th className="py-3 pr-4 font-normal">Name</th>
                    <th className="py-3 pr-4 font-normal text-right">Last price</th>
                    <th className="py-3 pr-4 font-normal text-right">24h change</th>
                    <th className="py-3 font-normal text-right">24h volume</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((pair, i) => (
                    <motion.tr
                      key={pair.symbol}
                      className="market-row"
                      initial={reduce ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.025, duration: 0.25 }}
                    >
                      <td className="py-3.5 pr-4 text-xs text-text-tertiary">{i + 1}</td>
                      <td className="py-3.5 pr-4">
                        <Link href="/register" className="flex items-center gap-3 hover:opacity-80">
                          <div className="w-7 h-7 rounded-full bg-bg-hover flex items-center justify-center text-[10px] font-bold text-text-secondary ring-1 ring-border">
                            {pair.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-text-primary">{pair.symbol}</span>
                            <span className="text-xs text-text-tertiary ml-2">{pair.name}</span>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        <Link href="/register" className="text-sm font-mono text-text-primary hover:text-brand tabular-nums">
                          ${formatNumber(pair.price, pair.price < 10 ? 4 : 2)}
                        </Link>
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        <Link href="/register">
                          <span
                            className={`inline-block text-xs font-mono px-1.5 py-0.5 rounded tabular-nums ${
                              pair.change24h >= 0 ? "text-green bg-green/10" : "text-red bg-red/10"
                            }`}
                          >
                            {formatPercent(pair.change24h)}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3.5 text-right">
                        <Link href="/register" className="text-sm font-mono text-text-tertiary hover:text-text-primary tabular-nums">
                          ${formatCompact(pair.volume24h)}
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
