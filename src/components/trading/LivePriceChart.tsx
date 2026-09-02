"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
import { LineChart, Layers } from "@/components/icons";
import { TradingViewAdvancedChart } from "@/components/trading/TradingViewAdvancedChart";
import { useThemeColors } from "@/hooks/useThemeColors";
import type { MarketPair } from "@/lib/market-data";
import { cn, formatCompact, formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

const TIMEFRAMES = [
  { id: "1", labelKey: "trading.tf1m" },
  { id: "5", labelKey: "trading.tf5m" },
  { id: "15", labelKey: "trading.tf15m" },
  { id: "60", labelKey: "trading.tf1h" },
  { id: "240", labelKey: "trading.tf4h" },
  { id: "D", labelKey: "trading.tf1d" },
] as const;

function sparkline(price: number, change24h: number) {
  const start = price / (1 + change24h / 100);
  const points = 48;
  const data: { i: number; price: number }[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const drift = start + (price - start) * t;
    const wobble = Math.sin(i * 0.55) * price * 0.004 + Math.sin(i * 1.3) * price * 0.002;
    data.push({ i, price: Math.max(0.0001, drift + wobble) });
  }
  data[data.length - 1] = { i: points - 1, price };
  return data;
}

function dayRange(price: number, change24h: number) {
  const prev = price / (1 + change24h / 100);
  const high = Math.max(price, prev) * 1.008;
  const low = Math.min(price, prev) * 0.992;
  return { high, low };
}

export function LivePriceChart({ pair }: { pair: MarketPair }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [interval, setInterval] = useState<(typeof TIMEFRAMES)[number]["id"]>("15");
  const [mode, setMode] = useState<"line" | "candle">("line");
  const data = useMemo(() => sparkline(pair.price, pair.change24h), [pair.price, pair.change24h]);
  const { high, low } = dayRange(pair.price, pair.change24h);
  const up = pair.change24h >= 0;
  const stroke = up ? "#34d399" : "#f87171";

  return (
    <div className="flex h-full min-h-[340px] flex-col rounded-2xl border border-border bg-bg-secondary p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-end gap-2">
            <p className="text-3xl font-bold tabular-nums text-text-primary sm:text-4xl">
              ${formatNumber(pair.price, pair.price < 10 ? 4 : 2)}
            </p>
            <span
              className={cn(
                "mb-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                up ? "bg-green/15 text-green" : "bg-red/15 text-red"
              )}
            >
              {formatPercent(pair.change24h)}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-tertiary">
            {pair.symbol} · {pair.name}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-right sm:min-w-[240px]">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-text-tertiary">{t("trading.high")}</p>
            <p className="text-sm font-semibold tabular-nums text-green">${formatNumber(high, high < 10 ? 4 : 2)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-text-tertiary">{t("trading.low")}</p>
            <p className="text-sm font-semibold tabular-nums text-red">${formatNumber(low, low < 10 ? 4 : 2)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-text-tertiary">{t("trading.volume")}</p>
            <p className="text-sm font-semibold tabular-nums text-text-primary">{formatCompact(pair.volume24h)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-xl border border-border bg-bg-tertiary p-1">
          <button
            type="button"
            onClick={() => setMode("line")}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              mode === "line" ? "bg-brand text-brand-text" : "text-text-tertiary hover:text-text-primary"
            )}
            aria-label="Line chart"
          >
            <LineChart className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMode("candle")}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              mode === "candle" ? "bg-brand text-brand-text" : "text-text-tertiary hover:text-text-primary"
            )}
            aria-label="Candlestick chart"
          >
            <Layers className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-bg-tertiary p-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              type="button"
              onClick={() => setInterval(tf.id)}
              className={cn(
                "h-8 min-w-9 rounded-lg px-2 text-xs font-semibold",
                interval === tf.id
                  ? "bg-brand text-brand-text"
                  : "text-text-tertiary hover:text-text-primary"
              )}
            >
              {t(tf.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1">
        {mode === "candle" ? (
          <div className="h-[280px] overflow-hidden rounded-xl sm:h-[340px]">
            <TradingViewAdvancedChart
              symbol={pair.symbol}
              interval={interval}
              style="1"
              className="h-full"
            />
          </div>
        ) : (
          <div className="h-[280px] sm:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="liveFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={stroke} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis
                  domain={["auto", "auto"]}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tick={{ fill: colors.textTertiary, fontSize: 10 }}
                  tickFormatter={(v) => `$${formatNumber(Number(v), Number(v) < 10 ? 2 : 0)}`}
                />
                <Tooltip
                  contentStyle={{
                    background: colors.bgSecondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    fontSize: 12,
                    color: colors.textPrimary,
                  }}
                  formatter={(value) => [formatCurrency(Number(value)), pair.symbol]}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={stroke}
                  strokeWidth={2}
                  fill="url(#liveFill)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
