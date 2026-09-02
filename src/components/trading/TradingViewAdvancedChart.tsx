"use client";

import { useMemo } from "react";
import { toTradingViewSymbol } from "@/lib/tradingview-symbols";
import { useTheme } from "@/components/theme/ThemeProvider";
import { TradingViewWidget } from "./TradingViewWidget";

const CHART_SCRIPT =
  "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

type TradingViewAdvancedChartProps = {
  symbol: string;
  interval?: string;
  style?: "1" | "3";
  className?: string;
};

export function TradingViewAdvancedChart({
  symbol,
  interval = "15",
  style = "1",
  className,
}: TradingViewAdvancedChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const tvSymbol = toTradingViewSymbol(symbol);

  const config = useMemo(
    () => ({
      autosize: true,
      symbol: tvSymbol,
      interval,
      timezone: "Etc/UTC",
      theme: isDark ? "dark" : "light",
      style,
      locale: "en",
      enable_publishing: false,
      backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
      gridColor: isDark ? "rgba(46, 46, 46, 0.6)" : "rgba(229, 231, 235, 0.8)",
      hide_top_toolbar: true,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      allow_symbol_change: false,
      withdateranges: false,
      details: false,
      hotlist: false,
      support_host: "https://www.tradingview.com",
    }),
    [tvSymbol, interval, style, isDark]
  );

  return (
    <TradingViewWidget
      scriptSrc={CHART_SCRIPT}
      config={config}
      className={className}
      showAttribution={false}
    />
  );
}
