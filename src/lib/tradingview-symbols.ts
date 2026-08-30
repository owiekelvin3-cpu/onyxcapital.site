/** Map Onyx Capital pair symbols to TradingView exchange symbols */
const TRADINGVIEW_SYMBOLS: Record<string, string> = {
  "BTC/USDT": "BINANCE:BTCUSDT",
  "ETH/USDT": "BINANCE:ETHUSDT",
  "SOL/USDT": "BINANCE:SOLUSDT",
  "BNB/USDT": "BINANCE:BNBUSDT",
  "XRP/USDT": "BINANCE:XRPUSDT",
  "DOGE/USDT": "BINANCE:DOGEUSDT",
  "ADA/USDT": "BINANCE:ADAUSDT",
  AAPL: "NASDAQ:AAPL",
  TSLA: "NASDAQ:TSLA",
  NVDA: "NASDAQ:NVDA",
  "EUR/USD": "FX:EURUSD",
  "GBP/USD": "FX:GBPUSD",
};

export function toTradingViewSymbol(pairSymbol: string): string {
  return TRADINGVIEW_SYMBOLS[pairSymbol] ?? pairSymbol.replace("/", "");
}

export function tradingViewTickerSymbols(limit = 8) {
  return Object.entries(TRADINGVIEW_SYMBOLS)
    .slice(0, limit)
    .map(([title, proName]) => ({ title, proName }));
}
