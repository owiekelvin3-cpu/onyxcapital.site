import type { MemeCoinInsert } from "@/lib/meme-coins/types";

const PREFIXES = [
  "Moon",
  "Pepe",
  "Doge",
  "Chad",
  "Based",
  "Turbo",
  "Mega",
  "Super",
  "Alpha",
  "Bonk",
  "Wojak",
  "Shiba",
  "Frog",
  "Neon",
  "Cyber",
  "Giga",
  "Ultra",
  "Sigma",
];

const SUFFIXES = [
  "Coin",
  "Inu",
  "Rocket",
  "Moon",
  "Pump",
  "Gem",
  "Ape",
  "Cat",
  "Fi",
  "Max",
  "X",
  "Lord",
];

const TAG_POOL = ["meme", "community", "viral", "degen", "live"];

const DESCRIPTIONS = [
  "Live trending meme coin on today's market — high search volume and community momentum.",
  "Trending meme token with strong 24h activity across social and market feeds.",
  "Hot meme coin pick with viral community energy and fast-moving price action.",
  "Live market meme token trending with traders today.",
  "Daily live meme listing with real-time market stats.",
];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function slugifyMemeCoin(name: string, symbol: string): string {
  return `${name}-${symbol}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function memeCoinAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(seed)}&backgroundColor=84cc16,22c55e,065f46`;
}

export function generateLiveMemeCoin(
  listDate: string,
  sortOrder: number,
  usedSlugs: Set<string>
): MemeCoinInsert {
  let name = "";
  let symbol = "";
  let slug = "";

  for (let attempt = 0; attempt < 24; attempt++) {
    name = `${pick(PREFIXES)}${pick(SUFFIXES)}`;
    symbol = name.replace(/[^a-zA-Z]/g, "").slice(0, 5).toUpperCase() || "MEME";
    slug = slugifyMemeCoin(name, symbol);
    if (!usedSlugs.has(slug)) break;
  }

  usedSlugs.add(slug);

  const price = randomBetween(0.000002, 0.42);
  const change = randomBetween(-35, 180);
  const marketCap = price * randomBetween(8_000_000, 900_000_000);

  return {
    list_date: listDate,
    symbol,
    name,
    slug,
    source: "trending",
    coingecko_id: null,
    price_usd: Number(price.toFixed(8)),
    change_24h: Number(change.toFixed(2)),
    market_cap_usd: Number(marketCap.toFixed(2)),
    image_url: memeCoinAvatarUrl(slug),
    description: pick(DESCRIPTIONS),
    tags: [pick(TAG_POOL), "trending", "live"],
    featured: false,
    status: "active",
    sort_order: sortOrder,
  };
}

/** @deprecated Use generateLiveMemeCoin */
export const generateOnyxMemeCoin = generateLiveMemeCoin;

export function buildManualMemeCoin(input: {
  listDate: string;
  name: string;
  symbol: string;
  description?: string;
  priceUsd?: number;
  change24h?: number;
  marketCapUsd?: number;
  imageUrl?: string;
  featured?: boolean;
  sortOrder?: number;
}): MemeCoinInsert {
  const symbol = input.symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const name = input.name.trim();
  const slug = slugifyMemeCoin(name, symbol);

  return {
    list_date: input.listDate,
    symbol,
    name,
    slug,
    source: "admin_manual",
    coingecko_id: null,
    price_usd: input.priceUsd ?? null,
    change_24h: input.change24h ?? null,
    market_cap_usd: input.marketCapUsd ?? null,
    image_url: input.imageUrl?.trim() || memeCoinAvatarUrl(slug),
    description: input.description?.trim() || "Live trending meme coin listing.",
    tags: ["meme", "trending", "live"],
    featured: input.featured ?? false,
    status: "active",
    sort_order: input.sortOrder ?? 0,
  };
}
