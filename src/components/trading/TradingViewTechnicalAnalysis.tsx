"use client";

import { useMemo } from "react";
import { toTradingViewSymbol } from "@/lib/tradingview-symbols";
import { TradingViewWidget } from "./TradingViewWidget";

const TA_SCRIPT =
  "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";

type TradingViewTechnicalAnalysisProps = {
  symbol: string;
};

export function TradingViewTechnicalAnalysis({
  symbol,
}: TradingViewTechnicalAnalysisProps) {
  const tvSymbol = toTradingViewSymbol(symbol);

  const config = useMemo(
    () => ({
      interval: "1D",
      width: "100%",
      height: "100%",
      isTransparent: true,
      symbol: tvSymbol,
      showIntervalTabs: true,
      displayMode: "single",
      locale: "en",
      colorTheme: "dark",
    }),
    [tvSymbol]
  );

  return (
    <div className="h-52 rounded-xl border border-border overflow-hidden bg-bg-primary">
      <TradingViewWidget
        scriptSrc={TA_SCRIPT}
        config={config}
        showAttribution={false}
      />
    </div>
  );
}
