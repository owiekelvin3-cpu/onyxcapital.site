export type TraderAvatarKind = "anime" | "illustrated" | "gradient" | "pixel" | "emoji";

export type CopyTraderProfile = {
  name: string;
  handle: string;
  bio: string;
  roi: number;
  followers: number;
  winRate: number;
  rating: number;
  avatarKind: TraderAvatarKind;
  /** DiceBear seed or gradient key */
  avatarSeed: string;
  ringColor: string;
  verified?: boolean;
  badge?: string;
};

function dicebear(style: string, seed: string, background?: string) {
  const bg = background ? `&backgroundColor=${background}` : "";
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}${bg}`;
}

export type CopyTraderSection = {
  id: string;
  title: string;
  subtitle: string;
  traders: CopyTraderProfile[];
};

const FEATURED_COPY_TRADERS: CopyTraderProfile[] = [
  {
    name: "AlphaTrader",
    handle: "@alpha.fx",
    bio: "Momentum scalper · BTC & ETH focus",
    roi: 142.5,
    followers: 2840,
    winRate: 78,
    rating: 4.9,
    avatarKind: "illustrated",
    avatarSeed: "alpha-trader",
    ringColor: "#3b82f6",
    verified: true,
    badge: "Pro",
  },
  {
    name: "CryptoKing",
    handle: "@cryptoking",
    bio: "Altcoin swing setups · high conviction",
    roi: 98.3,
    followers: 5620,
    winRate: 72,
    rating: 4.8,
    avatarKind: "anime",
    avatarSeed: "crypto-king",
    ringColor: "#f97316",
    verified: true,
  },
  {
    name: "YukiTrade",
    handle: "@yuki.trades",
    bio: "Tokyo session · JPY pairs & SOL",
    roi: 118.2,
    followers: 3910,
    winRate: 74,
    rating: 4.9,
    avatarKind: "anime",
    avatarSeed: "yuki-trade",
    ringColor: "#ec4899",
    verified: true,
    badge: "VIP",
  },
  {
    name: "QuantMaster",
    handle: "@quant.master",
    bio: "Systematic models · risk-first",
    roi: 67.1,
    followers: 1890,
    winRate: 81,
    rating: 4.7,
    avatarKind: "illustrated",
    avatarSeed: "quant-master",
    ringColor: "#6366f1",
  },
  {
    name: "SwingPro",
    handle: "@swingpro",
    bio: "Multi-day holds · FX majors",
    roi: 54.8,
    followers: 3210,
    winRate: 69,
    rating: 4.6,
    avatarKind: "gradient",
    avatarSeed: "swing-pro",
    ringColor: "#14b8a6",
  },
  {
    name: "DeFiWhale",
    handle: "@defi.whale",
    bio: "On-chain flows · L2 narratives",
    roi: 203.2,
    followers: 8900,
    winRate: 65,
    rating: 4.9,
    avatarKind: "pixel",
    avatarSeed: "defi-whale",
    ringColor: "#8b5cf6",
    verified: true,
    badge: "Whale",
  },
  {
    name: "SteadyGains",
    handle: "@steady.gains",
    bio: "Low drawdown · compounding daily",
    roi: 38.4,
    followers: 1450,
    winRate: 85,
    rating: 4.5,
    avatarKind: "gradient",
    avatarSeed: "steady-gains",
    ringColor: "#22c55e",
  },
  {
    name: "NovaPulse",
    handle: "@nova.pulse",
    bio: "Breakout hunter · indices & gold",
    roi: 89.6,
    followers: 4720,
    winRate: 71,
    rating: 4.8,
    avatarKind: "emoji",
    avatarSeed: "nova-pulse",
    ringColor: "#eab308",
  },
  {
    name: "MoonRunner",
    handle: "@moon.runner",
    bio: "Anime chart reader · meme + majors",
    roi: 156.8,
    followers: 6240,
    winRate: 68,
    rating: 4.8,
    avatarKind: "anime",
    avatarSeed: "moon-runner",
    ringColor: "#a855f7",
    verified: true,
  },
  {
    name: "ZenScalp",
    handle: "@zen.scalp",
    bio: "1m–5m precision · tight stops",
    roi: 76.3,
    followers: 2580,
    winRate: 79,
    rating: 4.7,
    avatarKind: "illustrated",
    avatarSeed: "zen-scalp",
    ringColor: "#06b6d4",
  },
  {
    name: "GridLord",
    handle: "@grid.lord",
    bio: "Range bots · sideways markets",
    roi: 44.2,
    followers: 1120,
    winRate: 83,
    rating: 4.4,
    avatarKind: "pixel",
    avatarSeed: "grid-lord",
    ringColor: "#64748b",
  },
  {
    name: "WolfStreet",
    handle: "@wolf.street",
    bio: "US open volatility · SPX & NAS",
    roi: 91.4,
    followers: 5100,
    winRate: 70,
    rating: 4.7,
    avatarKind: "gradient",
    avatarSeed: "wolf-street",
    ringColor: "#ef4444",
    badge: "Hot",
  },
];

const CRYPTO_LEGENDS: CopyTraderProfile[] = [
  {
    name: "ChainHawk",
    handle: "@chain.hawk",
    bio: "Layer-1 rotations · on-chain alpha",
    roi: 167.4,
    followers: 7120,
    winRate: 66,
    rating: 4.8,
    avatarKind: "anime",
    avatarSeed: "chain-hawk",
    ringColor: "#f59e0b",
    verified: true,
    badge: "Hot",
  },
  {
    name: "SolStorm",
    handle: "@sol.storm",
    bio: "SOL ecosystem · meme + DeFi pairs",
    roi: 134.9,
    followers: 5890,
    winRate: 70,
    rating: 4.7,
    avatarKind: "pixel",
    avatarSeed: "sol-storm",
    ringColor: "#14b8a6",
    verified: true,
  },
  {
    name: "LayerKing",
    handle: "@layer.king",
    bio: "L2 narratives · rollup plays",
    roi: 112.3,
    followers: 4210,
    winRate: 73,
    rating: 4.8,
    avatarKind: "illustrated",
    avatarSeed: "layer-king",
    ringColor: "#6366f1",
  },
  {
    name: "MemeLord",
    handle: "@meme.lord",
    bio: "High vol memes · strict risk caps",
    roi: 221.6,
    followers: 9340,
    winRate: 58,
    rating: 4.6,
    avatarKind: "emoji",
    avatarSeed: "meme-lord",
    ringColor: "#a855f7",
    badge: "Wild",
  },
  {
    name: "ETHOracle",
    handle: "@eth.oracle",
    bio: "ETH/BTC ratio · macro cycles",
    roi: 88.7,
    followers: 3650,
    winRate: 76,
    rating: 4.9,
    avatarKind: "gradient",
    avatarSeed: "eth-oracle",
    ringColor: "#3b82f6",
    verified: true,
  },
  {
    name: "BaseRider",
    handle: "@base.rider",
    bio: "Base chain gems · early entries",
    roi: 145.2,
    followers: 2780,
    winRate: 64,
    rating: 4.7,
    avatarKind: "anime",
    avatarSeed: "base-rider",
    ringColor: "#2563eb",
  },
];

const FOREX_MASTERS: CopyTraderProfile[] = [
  {
    name: "PipHunter",
    handle: "@pip.hunter",
    bio: "EUR/USD specialist · London open",
    roi: 62.4,
    followers: 3340,
    winRate: 77,
    rating: 4.8,
    avatarKind: "illustrated",
    avatarSeed: "pip-hunter",
    ringColor: "#0ea5e9",
    verified: true,
  },
  {
    name: "EuroFlow",
    handle: "@euro.flow",
    bio: "Euro crosses · ECB week focus",
    roi: 51.8,
    followers: 2890,
    winRate: 74,
    rating: 4.6,
    avatarKind: "gradient",
    avatarSeed: "euro-flow",
    ringColor: "#0284c7",
  },
  {
    name: "GBPulse",
    handle: "@gb.pulse",
    bio: "Cable · BOE volatility setups",
    roi: 73.1,
    followers: 4120,
    winRate: 71,
    rating: 4.7,
    avatarKind: "anime",
    avatarSeed: "gb-pulse",
    ringColor: "#dc2626",
    verified: true,
  },
  {
    name: "YenSamurai",
    handle: "@yen.samurai",
    bio: "USD/JPY · Tokyo + NY overlap",
    roi: 84.5,
    followers: 3560,
    winRate: 69,
    rating: 4.8,
    avatarKind: "pixel",
    avatarSeed: "yen-samurai",
    ringColor: "#ef4444",
    badge: "Pro",
  },
  {
    name: "FrancTrader",
    handle: "@franc.trader",
    bio: "CHF safe-haven · risk-off plays",
    roi: 39.6,
    followers: 1980,
    winRate: 82,
    rating: 4.5,
    avatarKind: "gradient",
    avatarSeed: "franc-trader",
    ringColor: "#64748b",
  },
  {
    name: "CableKing",
    handle: "@cable.king",
    bio: "GBP majors · news-driven entries",
    roi: 96.2,
    followers: 4670,
    winRate: 68,
    rating: 4.7,
    avatarKind: "illustrated",
    avatarSeed: "cable-king",
    ringColor: "#b91c1c",
    verified: true,
  },
];

const INDEX_COMMODITIES: CopyTraderProfile[] = [
  {
    name: "GoldRush",
    handle: "@gold.rush",
    bio: "XAU/USD · inflation hedges",
    roi: 58.3,
    followers: 5230,
    winRate: 75,
    rating: 4.8,
    avatarKind: "gradient",
    avatarSeed: "gold-rush",
    ringColor: "#eab308",
    verified: true,
    badge: "Pro",
  },
  {
    name: "OilBaron",
    handle: "@oil.baron",
    bio: "WTI & Brent · supply shocks",
    roi: 71.9,
    followers: 3890,
    winRate: 67,
    rating: 4.6,
    avatarKind: "pixel",
    avatarSeed: "oil-baron",
    ringColor: "#78350f",
  },
  {
    name: "SPXPilot",
    handle: "@spx.pilot",
    bio: "S&P 500 · trend following",
    roi: 45.7,
    followers: 6120,
    winRate: 78,
    rating: 4.7,
    avatarKind: "illustrated",
    avatarSeed: "spx-pilot",
    ringColor: "#16a34a",
    verified: true,
  },
  {
    name: "NasdaqNinja",
    handle: "@nasdaq.ninja",
    bio: "Tech-heavy · earnings season",
    roi: 93.4,
    followers: 4450,
    winRate: 66,
    rating: 4.8,
    avatarKind: "anime",
    avatarSeed: "nasdaq-ninja",
    ringColor: "#7c3aed",
    badge: "Hot",
  },
  {
    name: "DAXPro",
    handle: "@dax.pro",
    bio: "German index · EU session",
    roi: 52.1,
    followers: 2340,
    winRate: 73,
    rating: 4.5,
    avatarKind: "emoji",
    avatarSeed: "dax-pro",
    ringColor: "#1d4ed8",
  },
  {
    name: "SilverFox",
    handle: "@silver.fox",
    bio: "Silver & metals · ratio trades",
    roi: 64.8,
    followers: 1870,
    winRate: 71,
    rating: 4.6,
    avatarKind: "gradient",
    avatarSeed: "silver-fox",
    ringColor: "#94a3b8",
  },
];

const SCALPING_SQUAD: CopyTraderProfile[] = [
  {
    name: "FlashTrade",
    handle: "@flash.trade",
    bio: "Sub-minute entries · tight RR",
    roi: 82.6,
    followers: 2980,
    winRate: 81,
    rating: 4.7,
    avatarKind: "pixel",
    avatarSeed: "flash-trade",
    ringColor: "#06b6d4",
    verified: true,
  },
  {
    name: "MicroEdge",
    handle: "@micro.edge",
    bio: "Tick charts · liquidity grabs",
    roi: 69.3,
    followers: 2140,
    winRate: 84,
    rating: 4.6,
    avatarKind: "anime",
    avatarSeed: "micro-edge",
    ringColor: "#0891b2",
  },
  {
    name: "TickMaster",
    handle: "@tick.master",
    bio: "DOM reading · futures scalps",
    roi: 77.5,
    followers: 3670,
    winRate: 79,
    rating: 4.8,
    avatarKind: "illustrated",
    avatarSeed: "tick-master",
    ringColor: "#0d9488",
    verified: true,
    badge: "Pro",
  },
  {
    name: "FastFinger",
    handle: "@fast.finger",
    bio: "US open only · 15–30 pip targets",
    roi: 91.2,
    followers: 4890,
    winRate: 76,
    rating: 4.7,
    avatarKind: "emoji",
    avatarSeed: "fast-finger",
    ringColor: "#f97316",
  },
  {
    name: "BlitzScalp",
    handle: "@blitz.scalp",
    bio: "BTC perp · 1m structure",
    roi: 108.4,
    followers: 5520,
    winRate: 72,
    rating: 4.8,
    avatarKind: "gradient",
    avatarSeed: "blitz-scalp",
    ringColor: "#ea580c",
    badge: "Hot",
  },
  {
    name: "RapidFire",
    handle: "@rapid.fire",
    bio: "Multi-pair scalper · Asian session",
    roi: 63.7,
    followers: 1760,
    winRate: 80,
    rating: 4.5,
    avatarKind: "pixel",
    avatarSeed: "rapid-fire",
    ringColor: "#14b8a6",
  },
];

const RISING_STARS: CopyTraderProfile[] = [
  {
    name: "NeonTrader",
    handle: "@neon.trader",
    bio: "New verified · altcoin breakouts",
    roi: 178.9,
    followers: 1240,
    winRate: 62,
    rating: 4.9,
    avatarKind: "anime",
    avatarSeed: "neon-trader",
    ringColor: "#d946ef",
    verified: true,
    badge: "New",
  },
  {
    name: "PixelProfit",
    handle: "@pixel.profit",
    bio: "Rising ROI · gaming token plays",
    roi: 192.3,
    followers: 980,
    winRate: 59,
    rating: 4.7,
    avatarKind: "pixel",
    avatarSeed: "pixel-profit",
    ringColor: "#8b5cf6",
    badge: "New",
  },
  {
    name: "ApexRise",
    handle: "@apex.rise",
    bio: "Fast follower growth · swing crypto",
    roi: 124.6,
    followers: 1560,
    winRate: 71,
    rating: 4.8,
    avatarKind: "illustrated",
    avatarSeed: "apex-rise",
    ringColor: "#6366f1",
    verified: true,
    badge: "Rising",
  },
  {
    name: "VoltTrade",
    handle: "@volt.trade",
    bio: "High energy setups · volatile hours",
    roi: 156.1,
    followers: 890,
    winRate: 64,
    rating: 4.6,
    avatarKind: "emoji",
    avatarSeed: "volt-trade",
    ringColor: "#eab308",
    badge: "New",
  },
  {
    name: "StarPath",
    handle: "@star.path",
    bio: "Consistent monthly gains · low DD",
    roi: 87.4,
    followers: 2100,
    winRate: 77,
    rating: 4.9,
    avatarKind: "gradient",
    avatarSeed: "star-path",
    ringColor: "#22c55e",
    verified: true,
    badge: "Rising",
  },
  {
    name: "ByteGain",
    handle: "@byte.gain",
    bio: "AI token baskets · thematic trades",
    roi: 143.8,
    followers: 1340,
    winRate: 68,
    rating: 4.7,
    avatarKind: "anime",
    avatarSeed: "byte-gain",
    ringColor: "#3b82f6",
    badge: "New",
  },
];

export const COPY_TRADER_SECTIONS: CopyTraderSection[] = [
  {
    id: "featured",
    title: "Featured Elite",
    subtitle: "Top verified performers — our original copy trading roster.",
    traders: FEATURED_COPY_TRADERS,
  },
  {
    id: "crypto",
    title: "Crypto Legends",
    subtitle: "On-chain specialists, L1/L2 rotations, and high-conviction alt plays.",
    traders: CRYPTO_LEGENDS,
  },
  {
    id: "forex",
    title: "Forex Masters",
    subtitle: "Major pairs, session timing, and macro-driven FX strategies.",
    traders: FOREX_MASTERS,
  },
  {
    id: "indices",
    title: "Indices & Commodities",
    subtitle: "Gold, oil, indices, and metals for diversified copy portfolios.",
    traders: INDEX_COMMODITIES,
  },
  {
    id: "scalping",
    title: "Scalping Squad",
    subtitle: "Fast in-and-out traders with high win rates and tight risk control.",
    traders: SCALPING_SQUAD,
  },
  {
    id: "rising",
    title: "Rising Stars",
    subtitle: "New and trending traders climbing the leaderboard this month.",
    traders: RISING_STARS,
  },
];

export const COPY_TRADERS: CopyTraderProfile[] = COPY_TRADER_SECTIONS.flatMap(
  (section) => section.traders
);

export function traderAvatarUrl(trader: CopyTraderProfile): string {
  switch (trader.avatarKind) {
    case "anime":
      return dicebear("adventurer", trader.avatarSeed, "ffd5dc,ffdfbf,c0aede");
    case "illustrated":
      return dicebear("lorelei", trader.avatarSeed, "b6e3f4,c0aede,d1d4f9");
    case "pixel":
      return dicebear("pixel-art", trader.avatarSeed, "fef3c7,d1fae5,e0e7ff");
    case "emoji":
      return dicebear("fun-emoji", trader.avatarSeed, "ffedd5,fecdd3,e9d5ff");
    case "gradient":
    default:
      return dicebear("notionists", trader.avatarSeed, "e2e8f0,f1f5f9,e0f2fe");
  }
}

export function traderInitials(name: string) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function gradientForSeed(seed: string): [string, string] {
  const palettes: [string, string][] = [
    ["#6366f1", "#a855f7"],
    ["#0ea5e9", "#22d3ee"],
    ["#f97316", "#ef4444"],
    ["#22c55e", "#14b8a6"],
    ["#ec4899", "#f43f5e"],
    ["#eab308", "#f97316"],
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * (i + 1)) % palettes.length;
  return palettes[hash] ?? palettes[0];
}
