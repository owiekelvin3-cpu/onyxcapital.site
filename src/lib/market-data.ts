export interface MarketPair {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  category: "crypto" | "stock" | "forex";
}

export const MARKET_PAIRS: MarketPair[] = [
  { symbol: "BTC/USDT", name: "Bitcoin", price: 97234.5, change24h: 2.34, volume24h: 2840000000, category: "crypto" },
  { symbol: "ETH/USDT", name: "Ethereum", price: 3456.78, change24h: 1.87, volume24h: 1520000000, category: "crypto" },
  { symbol: "SOL/USDT", name: "Solana", price: 187.42, change24h: -0.56, volume24h: 890000000, category: "crypto" },
  { symbol: "BNB/USDT", name: "BNB", price: 612.3, change24h: 0.92, volume24h: 420000000, category: "crypto" },
  { symbol: "XRP/USDT", name: "XRP", price: 2.34, change24h: 3.12, volume24h: 780000000, category: "crypto" },
  { symbol: "AAPL", name: "Apple Inc.", price: 228.45, change24h: 0.67, volume24h: 52000000, category: "stock" },
  { symbol: "TSLA", name: "Tesla Inc.", price: 412.89, change24h: -1.23, volume24h: 89000000, category: "stock" },
  { symbol: "NVDA", name: "NVIDIA Corp.", price: 134.56, change24h: 2.89, volume24h: 67000000, category: "stock" },
  { symbol: "EUR/USD", name: "Euro / US Dollar", price: 1.0842, change24h: -0.12, volume24h: 1200000000, category: "forex" },
  { symbol: "GBP/USD", name: "British Pound / USD", price: 1.2678, change24h: 0.08, volume24h: 890000000, category: "forex" },
  { symbol: "DOGE/USDT", name: "Dogecoin", price: 0.3421, change24h: 5.67, volume24h: 340000000, category: "crypto" },
  { symbol: "USDT/USD", name: "Tether", price: 1, change24h: 0.01, volume24h: 52000000000, category: "crypto" },
  { symbol: "LTC/USDT", name: "Litecoin", price: 98.5, change24h: 1.2, volume24h: 480000000, category: "crypto" },
  { symbol: "ADA/USDT", name: "Cardano", price: 0.9876, change24h: -0.34, volume24h: 210000000, category: "crypto" },
];

export const TICKER_PAIRS = MARKET_PAIRS.slice(0, 8);

export function generateChartData(days = 30) {
  const data = [];
  let price = 85000;
  const now = Date.now();
  for (let i = days; i >= 0; i--) {
    price += (Math.random() - 0.48) * 2000;
    price = Math.max(price, 70000);
    data.push({
      date: new Date(now - i * 86400000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      price: Math.round(price * 100) / 100,
    });
  }
  return data;
}
