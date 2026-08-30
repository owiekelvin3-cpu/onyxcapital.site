"use client";

import { useMemo } from "react";
import { tradingViewTickerSymbols } from "@/lib/tradingview-symbols";
import { TradingViewWidget } from "./TradingViewWidget";

const TICKER_SCRIPT =
  "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";

export function TradingViewTickerTape() {
  const config = useMemo(
    () => ({
      symbols: tradingViewTickerSymbols(),
      showSymbolLogo: true,
      colorTheme: "dark",
      isTransparent: true,
      displayMode: "adaptive",
      locale: "en",
    }),
    []
  );

  return (
    <div className="h-11 sm:h-12 rounded-xl border border-border overflow-hidden bg-bg-secondary">
      <TradingViewWidget
        scriptSrc={TICKER_SCRIPT}
        config={config}
        showAttribution={false}
      />
    </div>
  );
}
