export interface AIBot {
  id: string;
  name: string;
  description: string;
  simpleDescription: string;
  beginnerFriendly?: boolean;
  winRate: number;
  risk: "low" | "medium" | "high";
  markets: string[];
  minPower: number;
  accent: string;
}

export const RECOMMENDED_BOT_ID = "nexus";

export const AI_BOTS: AIBot[] = [
  {
    id: "nexus",
    name: "Onyx Capital Core",
    description: "Conservative execution focused on capital preservation across major crypto pairs.",
    simpleDescription: "Best for beginners — steady automated crypto trading.",
    beginnerFriendly: true,
    winRate: 100,
    risk: "low",
    markets: ["BTC", "ETH", "SOL"],
    minPower: 250,
    accent: "#f0b90b",
  },
  {
    id: "quantum",
    name: "Onyx Capital Momentum",
    description: "Balanced cross-market engine that rotates exposure across liquid assets.",
    simpleDescription: "Balanced bot for active market conditions.",
    winRate: 100,
    risk: "medium",
    markets: ["BTC", "ETH", "BNB", "XRP"],
    minPower: 500,
    accent: "#0ecb81",
  },
  {
    id: "apex",
    name: "Onyx Capital Alpha",
    description: "High-conviction momentum system for larger allocations.",
    simpleDescription: "Advanced bot for larger allocations.",
    winRate: 100,
    risk: "high",
    markets: ["BTC", "ETH", "SOL", "DOGE"],
    minPower: 1000,
    accent: "#6366f1",
  },
];

export function getBotById(botId: string): AIBot | undefined {
  return AI_BOTS.find((b) => b.id === botId);
}

export function getBotName(botId: string): string {
  return getBotById(botId)?.name ?? botId;
}

export const BEGINNER_DURATIONS = [
  { hours: 6, labelKey: "aiTrading.duration6h", shortLabel: "6h" },
  { hours: 24, labelKey: "aiTrading.duration24h", shortLabel: "24h" },
  { hours: 168, labelKey: "aiTrading.duration7d", shortLabel: "7d" },
] as const;

export const CRYPTO_ASSETS = [
  { id: "BTC", label: "Bitcoin", pair: "BTC/USDT" },
  { id: "ETH", label: "Ethereum", pair: "ETH/USDT" },
  { id: "SOL", label: "Solana", pair: "SOL/USDT" },
  { id: "BNB", label: "BNB", pair: "BNB/USDT" },
  { id: "XRP", label: "XRP", pair: "XRP/USDT" },
  { id: "DOGE", label: "Dogecoin", pair: "DOGE/USDT" },
] as const;

export const ASSET_SYMBOL_MAP: Record<string, string> = {
  BTC: "BTC/USDT",
  ETH: "ETH/USDT",
  SOL: "SOL/USDT",
  BNB: "BNB/USDT",
  XRP: "XRP/USDT",
  DOGE: "DOGE/USDT",
};

export function seedEntryPrice(asset: string): number {
  switch (asset.toUpperCase()) {
    case "ETH":
      return 3200;
    case "SOL":
      return 145;
    case "BNB":
      return 580;
    case "XRP":
      return 0.62;
    case "DOGE":
      return 0.16;
    default:
      return 68000;
  }
}
