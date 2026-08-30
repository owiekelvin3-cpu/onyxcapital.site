"use client";

import { useMemo } from "react";
import { toTradingViewSymbol } from "@/lib/tradingview-symbols";
import { TradingViewWidget } from "./TradingViewWidget";

const CHART_SCRIPT =
  "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

type TradingViewAdvancedChartProps = {
  symbol: string;
  interval?: string;
  className?: string;
};

export function TradingViewAdvancedChart({
  symbol,
  interval = "60",
  className,
}: TradingViewAdvancedChartProps) {
  const tvSymbol = toTradingViewSymbol(symbol);

  const config = useMemo(
    () => ({
      autosize: true,
      symbol: tvSymbol,
      interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      backgroundColor: "rgba(19, 23, 34, 1)",
      gridColor: "rgba(42, 46, 57, 0.6)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      allow_symbol_change: false,
      withdateranges: true,
      details: false,
      hotlist: false,
      support_host: "https://www.tradingview.com",
    }),
    [tvSymbol, interval]
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
