"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MarketPair } from "@/lib/market-data";
import { generateChartData } from "@/lib/market-data";
import {
  cn,
  formatCompact,
  formatNumber,
  formatPercent,
} from "@/lib/utils";
import { useThemeColors } from "@/hooks/useThemeColors";
import { MarketTable } from "@/components/dashboard/MarketTable";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  DeckoProgressBar,
  DeckoStagger,
  DeckoStaggerItem,
  useCountUp,
} from "@/components/dashboard/decko/decko-motion";
import { Globe, Layers, LineChart, TrendingUp, Zap } from "@/components/icons";

type Props = {
  marketPairs: MarketPair[];
  updatedAt: string;
};

const CATEGORY_TABS = ["All", "Crypto", "Stocks", "Forex", "Gainers", "Losers"] as const;
const CHART_RANGES = ["7D", "30D", "90D"] as const;

function pairBase(symbol: string) {
  return symbol.split("/")[0] ?? symbol;
}

function categoryLabel(category: MarketPair["category"]) {
  if (category === "crypto") return "Crypto";
  if (category === "stock") return "Stocks";
  return "Forex";
}

function heatColor(change: number) {
  if (change >= 3) return "bg-green/25 border-green/40 text-green";
  if (change >= 1) return "bg-green/15 border-green/25 text-green";
  if (change >= 0) return "bg-green/8 border-green/15 text-text-primary";
  if (change >= -1) return "bg-red/8 border-red/15 text-text-primary";
  if (change >= -3) return "bg-red/15 border-red/25 text-red";
  return "bg-red/25 border-red/40 text-red";
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Globe;
}) {
  return (
    <DeckoStaggerItem>
      <motion.div
        className="decko-card h-full p-5"
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-text-secondary">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-text-primary">{value}</p>
            {sub && <p className="mt-2 text-xs font-medium text-text-tertiary">{sub}</p>}
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-tertiary text-text-primary">
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </motion.div>
    </DeckoStaggerItem>
  );
}

function MarketTrendChart({ range }: { range: (typeof CHART_RANGES)[number] }) {
  const colors = useThemeColors();
  const days = range === "7D" ? 7 : range === "30D" ? 30 : 90;
  const data = useMemo(() => generateChartData(days), [days]);

  return (
    <div className="h-[220px] sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="marketAnalyticsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.brand} stopOpacity={0.22} />
              <stop offset="95%" stopColor={colors.brand} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: colors.textTertiary, fontSize: 10 }}
            dy={8}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: colors.textTertiary, fontSize: 10 }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={42}
          />
          <Tooltip
            contentStyle={{
              background: colors.bgSecondary,
              border: `1px solid ${colors.border}`,
              borderRadius: "12px",
              fontSize: "12px",
              color: colors.textPrimary,
              boxShadow: "var(--shadow-card)",
            }}
            formatter={(value) => [`$${formatNumber(Number(value), 0)}`, "BTC"]}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={colors.brand}
            strokeWidth={2}
            fill="url(#marketAnalyticsFill)"
            activeDot={{
              r: 4,
              fill: colors.brand,
              stroke: colors.bgSecondary,
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DeckoMarketAnalytics({ marketPairs, updatedAt }: Props) {
  const [tab, setTab] = useState<(typeof CATEGORY_TABS)[number]>("All");
  const [chartRange, setChartRange] = useState<(typeof CHART_RANGES)[number]>("30D");
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    const totalVolume = marketPairs.reduce((sum, p) => sum + p.volume24h, 0);
    const avgChange =
      marketPairs.length > 0
        ? marketPairs.reduce((sum, p) => sum + p.change24h, 0) / marketPairs.length
        : 0;
    const gainers = marketPairs.filter((p) => p.change24h >= 0).length;
    const losers = marketPairs.length - gainers;
    const topGainer = [...marketPairs].sort((a, b) => b.change24h - a.change24h)[0];
    const topLoser = [...marketPairs].sort((a, b) => a.change24h - b.change24h)[0];

    const byCategory = (["crypto", "stock", "forex"] as const).map((category) => {
      const items = marketPairs.filter((p) => p.category === category);
      const volume = items.reduce((sum, p) => sum + p.volume24h, 0);
      const change =
        items.length > 0
          ? items.reduce((sum, p) => sum + p.change24h, 0) / items.length
          : 0;
      return {
        category,
        label: categoryLabel(category),
        count: items.length,
        volume,
        volumeShare: totalVolume > 0 ? (volume / totalVolume) * 100 : 0,
        change,
      };
    });

    return {
      totalVolume,
      avgChange,
      gainers,
      losers,
      topGainer,
      topLoser,
      byCategory,
      breadthPct: marketPairs.length > 0 ? (gainers / marketPairs.length) * 100 : 50,
    };
  }, [marketPairs]);

  const filteredPairs = useMemo(() => {
    let rows = [...marketPairs];

    if (tab === "Crypto") rows = rows.filter((p) => p.category === "crypto");
    else if (tab === "Stocks") rows = rows.filter((p) => p.category === "stock");
    else if (tab === "Forex") rows = rows.filter((p) => p.category === "forex");
    else if (tab === "Gainers") rows = rows.sort((a, b) => b.change24h - a.change24h);
    else if (tab === "Losers") rows = rows.sort((a, b) => a.change24h - b.change24h);
    else rows = rows.sort((a, b) => b.volume24h - a.volume24h);

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (p) =>
          p.symbol.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.category.includes(q)
      );
    }

    return rows;
  }, [marketPairs, tab, query]);

  const heatmapPairs = useMemo(
    () => [...marketPairs].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)),
    [marketPairs]
  );

  const volumeDisplay = useCountUp(stats.totalVolume / 1_000_000_000, {
    decimals: 2,
    duration: 1.3,
  });
  const breadthDisplay = useCountUp(stats.breadthPct, { decimals: 1, duration: 1.1 });

  return (
    <div className="decko-dashboard mx-auto max-w-[1320px]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Market Analytics</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Live prices, sector breakdown, and market breadth across crypto, stocks, and forex.
          </p>
          <p className="mt-1 text-xs text-text-tertiary">Updated {updatedAt}</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle className="rounded-xl border border-border bg-bg-secondary" />
          <Link
            href="/dashboard/copy-trading"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--fin-btn-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--fin-btn-fg)] transition-transform hover:scale-[1.02]"
          >
            <TrendingUp className="h-4 w-4" />
            Copy Trade
          </Link>
        </div>
      </div>

      <DeckoStagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="24h Volume"
          value={`$${volumeDisplay}B`}
          sub={`${marketPairs.length} instruments tracked`}
          icon={Globe}
        />
        <StatCard
          label="Market Sentiment"
          value={formatPercent(stats.avgChange)}
          sub={`${stats.gainers} up · ${stats.losers} down`}
          icon={LineChart}
        />
        <StatCard
          label="Top Gainer"
          value={stats.topGainer ? pairBase(stats.topGainer.symbol) : "—"}
          sub={
            stats.topGainer
              ? `${formatPercent(stats.topGainer.change24h)} · $${formatNumber(stats.topGainer.price, stats.topGainer.price < 10 ? 4 : 2)}`
              : undefined
          }
          icon={Zap}
        />
        <StatCard
          label="Top Loser"
          value={stats.topLoser ? pairBase(stats.topLoser.symbol) : "—"}
          sub={
            stats.topLoser
              ? `${formatPercent(stats.topLoser.change24h)} · $${formatNumber(stats.topLoser.price, stats.topLoser.price < 10 ? 4 : 2)}`
              : undefined
          }
          icon={Layers}
        />
      </DeckoStagger>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_340px]">
        <DeckoStaggerItem className="min-w-0">
          <div className="decko-card p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-text-primary">BTC Price Trend</h2>
                <p className="text-sm text-text-secondary">Simulated benchmark chart</p>
              </div>
              <div className="flex gap-1 rounded-xl border border-border bg-bg-primary p-1">
                {CHART_RANGES.map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setChartRange(range)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                      chartRange === range
                        ? "bg-[var(--decko-accent)] text-[var(--decko-accent-text)]"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <MarketTrendChart range={chartRange} />
          </div>
        </DeckoStaggerItem>

        <DeckoStaggerItem className="space-y-4">
          <div className="decko-card p-5">
            <h2 className="text-lg font-bold text-text-primary">Market Breadth</h2>
            <p className="mt-1 text-sm text-text-secondary">Share of instruments positive today</p>
            <div className="mt-5">
              <div className="mb-2 flex items-end justify-between">
                <p className="text-3xl font-bold text-text-primary">{breadthDisplay}%</p>
                <p className="text-xs text-text-tertiary">
                  {stats.gainers}/{marketPairs.length} advancing
                </p>
              </div>
              <DeckoProgressBar value={stats.breadthPct} delay={0.15} />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-green/20 bg-green/8 px-3 py-2.5">
                  <p className="text-xs text-text-tertiary">Gainers</p>
                  <p className="text-lg font-bold text-green">{stats.gainers}</p>
                </div>
                <div className="rounded-xl border border-red/20 bg-red/8 px-3 py-2.5">
                  <p className="text-xs text-text-tertiary">Losers</p>
                  <p className="text-lg font-bold text-red">{stats.losers}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="decko-card p-5">
            <h2 className="text-lg font-bold text-text-primary">Sector Mix</h2>
            <div className="mt-5 space-y-4">
              {stats.byCategory.map((sector, index) => (
                <div key={sector.category}>
                  <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                    <span className="text-text-secondary">
                      {sector.label}{" "}
                      <span className="text-text-tertiary">({sector.count})</span>
                    </span>
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        sector.change >= 0 ? "text-green" : "text-red"
                      )}
                    >
                      {formatPercent(sector.change)}
                    </span>
                  </div>
                  <DeckoProgressBar value={sector.volumeShare} delay={0.2 + index * 0.1} />
                  <p className="mt-1 text-[11px] text-text-tertiary">
                    ${formatCompact(sector.volume)} volume · {sector.volumeShare.toFixed(1)}% share
                  </p>
                </div>
              ))}
            </div>
          </div>
        </DeckoStaggerItem>
      </div>

      <DeckoStaggerItem className="mt-4">
        <div className="decko-card p-5 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Market Heatmap</h2>
              <p className="text-sm text-text-secondary">24h change intensity by instrument</p>
            </div>
            <Link
              href="/dashboard/copy-trading"
              className="text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              Copy trading →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {heatmapPairs.map((pair, index) => (
              <motion.div
                key={pair.symbol}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 + index * 0.03 }}
              >
                <div
                  className={cn(
                    "flex min-h-[88px] flex-col justify-between rounded-xl border p-3",
                    heatColor(pair.change24h)
                  )}
                >
                  <span className="text-xs font-semibold">{pairBase(pair.symbol)}</span>
                  <div>
                    <p className="text-[11px] text-text-tertiary">{categoryLabel(pair.category)}</p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums">
                      {formatPercent(pair.change24h)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </DeckoStaggerItem>

      <DeckoStaggerItem className="mt-4">
        <div className="decko-card p-5 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-text-primary">All Markets</h2>
              <p className="text-sm text-text-secondary">Filter by asset class or performance</p>
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search symbol or name..."
              className="h-10 w-full rounded-xl border border-border bg-bg-primary px-3 text-sm text-text-primary outline-none focus:border-[var(--decko-accent)]/50 lg:max-w-xs"
            />
          </div>

          <div className="scroll-tabs mb-4 flex gap-2 overflow-x-auto pb-1">
            {CATEGORY_TABS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  tab === item
                    ? "bg-[var(--decko-accent)] text-[var(--decko-accent-text)]"
                    : "border border-border bg-bg-primary text-text-secondary hover:text-text-primary"
                )}
              >
                {item}
              </button>
            ))}
          </div>

          <MarketTable pairs={filteredPairs} showIcons />
        </div>
      </DeckoStaggerItem>
    </div>
  );
}
