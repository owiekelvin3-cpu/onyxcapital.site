import type { SupabaseClient } from "@supabase/supabase-js";
import { generateLiveMemeCoin, slugifyMemeCoin } from "@/lib/meme-coins/generate";
import {
  DAILY_MEME_COIN_TARGET,
  LIVE_FILL_MIN,
  TRENDING_SLOT_MAX,
  type MemeCoinInsert,
  type MemeCoinRow,
} from "@/lib/meme-coins/types";

type TrendingCoin = {
  id: string;
  name: string;
  symbol: string;
  thumb?: string;
  price?: number;
  change24h?: number;
  marketCap?: number;
};

type MemeMarketRow = {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price?: number;
  price_change_percentage_24h?: number;
  market_cap?: number;
};

const MEME_KEYWORD =
  /meme|pepe|doge|shib|inu|bonk|wif|frog|cat|moon|ape|floki|trump|elon|wojak|chad|based|pump|degen/i;

export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isMemeLike(name: string, symbol: string): boolean {
  return MEME_KEYWORD.test(`${name} ${symbol}`);
}

function parseTrendingCoins(payload: unknown): TrendingCoin[] {
  const root = payload as {
    coins?: Array<{
      item?: {
        id?: string;
        name?: string;
        symbol?: string;
        thumb?: string;
        data?: {
          price?: number | string;
          price_change_percentage_24h?: Record<string, number | string>;
          market_cap?: string;
        };
      };
    }>;
  };

  return (root.coins ?? [])
    .map((row) => {
      const item = row.item;
      if (!item?.id || !item.name || !item.symbol) return null;

      const changeRaw = item.data?.price_change_percentage_24h?.usd;
      const change =
        typeof changeRaw === "number"
          ? changeRaw
          : typeof changeRaw === "string"
            ? Number(changeRaw)
            : undefined;

      return {
        id: item.id,
        name: item.name,
        symbol: item.symbol.toUpperCase(),
        thumb: item.thumb,
        price: typeof item.data?.price === "number" ? item.data.price : Number(item.data?.price),
        change24h: Number.isFinite(change) ? change : undefined,
        marketCap: item.data?.market_cap ? Number(item.data.market_cap) : undefined,
      } satisfies TrendingCoin;
    })
    .filter(Boolean) as TrendingCoin[];
}

async function fetchCoinGeckoTrending(): Promise<TrendingCoin[]> {
  const headers: HeadersInit = {};
  const demoKey = process.env.COINGECKO_API_KEY;
  if (demoKey) headers["x-cg-demo-api-key"] = demoKey;

  const res = await fetch("https://api.coingecko.com/api/v3/search/trending", {
    headers,
    next: { revalidate: 600 },
  });

  if (!res.ok) {
    throw new Error(`CoinGecko trending ${res.status}`);
  }

  return parseTrendingCoins(await res.json());
}

async function fetchMemeCategoryMarkets(): Promise<MemeMarketRow[]> {
  const headers: HeadersInit = {};
  const demoKey = process.env.COINGECKO_API_KEY;
  if (demoKey) headers["x-cg-demo-api-key"] = demoKey;

  const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("category", "meme-token");
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", "50");
  url.searchParams.set("page", "1");
  url.searchParams.set("sparkline", "false");
  url.searchParams.set("price_change_percentage", "24h");

  const res = await fetch(url.toString(), { headers, next: { revalidate: 600 } });
  if (!res.ok) {
    throw new Error(`CoinGecko meme markets ${res.status}`);
  }

  return (await res.json()) as MemeMarketRow[];
}

function buildTrendingInsert(
  coin: TrendingCoin | MemeMarketRow,
  listDate: string,
  sortOrder: number,
  sourceTag: string
): MemeCoinInsert {
  const isMarket = "current_price" in coin;
  const id = coin.id;
  const name = coin.name;
  const symbol = coin.symbol.toUpperCase();
  const slug = slugifyMemeCoin(name, symbol);

  return {
    list_date: listDate,
    symbol,
    name,
    slug,
    source: "trending",
    coingecko_id: id,
    price_usd: isMarket ? coin.current_price ?? null : (coin as TrendingCoin).price ?? null,
    change_24h: isMarket
      ? coin.price_change_percentage_24h ?? null
      : (coin as TrendingCoin).change24h ?? null,
    market_cap_usd: isMarket ? coin.market_cap ?? null : (coin as TrendingCoin).marketCap ?? null,
    image_url: isMarket ? coin.image ?? null : (coin as TrendingCoin).thumb ?? null,
    description: `Live trending meme coin sourced from CoinGecko (${sourceTag}). High volatility — for information only.`,
    tags: ["meme", "trending", "live"],
    featured: false,
    status: "active",
    sort_order: sortOrder,
  };
}

function mergeTrendingCandidates(
  trending: TrendingCoin[],
  memeMarkets: MemeMarketRow[]
): Array<TrendingCoin | MemeMarketRow> {
  const byId = new Map<string, TrendingCoin | MemeMarketRow>();
  const ordered: Array<TrendingCoin | MemeMarketRow> = [];

  for (const coin of trending) {
    if (!isMemeLike(coin.name, coin.symbol)) continue;
    if (byId.has(coin.id)) continue;
    byId.set(coin.id, coin);
    ordered.push(coin);
  }

  for (const coin of memeMarkets) {
    if (byId.has(coin.id)) continue;
    byId.set(coin.id, coin);
    ordered.push(coin);
  }

  for (const coin of trending) {
    if (byId.has(coin.id)) continue;
    byId.set(coin.id, coin);
    ordered.push(coin);
  }

  return ordered;
}

export type MemeCoinSyncResult = {
  listDate: string;
  inserted: number;
  skipped: number;
  trending: number;
  generated: number;
  total: number;
};

export async function runDailyMemeCoinSync(
  supabase: SupabaseClient,
  options?: { listDate?: string; force?: boolean }
): Promise<MemeCoinSyncResult> {
  const listDate = options?.listDate ?? utcToday();

  const { data: existing, error: existingError } = await supabase
    .from("daily_meme_coins")
    .select("*")
    .eq("list_date", listDate)
    .eq("status", "active")
    .order("sort_order", { ascending: true });

  if (existingError) {
    throw new Error(existingError.message);
  }

  const rows = (existing ?? []) as MemeCoinRow[];
  if (!options?.force && rows.length >= DAILY_MEME_COIN_TARGET) {
    return {
      listDate,
      inserted: 0,
      skipped: rows.length,
      trending: rows.filter((r) => r.source === "trending").length,
      generated: rows.filter((r) => !r.coingecko_id).length,
      total: rows.length,
    };
  }

  const usedSlugs = new Set(rows.map((r) => r.slug));
  let sortOrder = rows.length;

  const [trending, memeMarkets] = await Promise.all([
    fetchCoinGeckoTrending().catch(() => [] as TrendingCoin[]),
    fetchMemeCategoryMarkets().catch(() => [] as MemeMarketRow[]),
  ]);

  const candidates = mergeTrendingCandidates(trending, memeMarkets);
  const trendingTarget = Math.min(
    TRENDING_SLOT_MAX,
    Math.max(DAILY_MEME_COIN_TARGET - LIVE_FILL_MIN, 0)
  );

  const toInsert: MemeCoinInsert[] = [];

  for (const coin of candidates) {
    if (toInsert.filter((r) => r.source === "trending").length >= trendingTarget) break;
    const slug = slugifyMemeCoin(coin.name, coin.symbol.toUpperCase());
    if (usedSlugs.has(slug)) continue;
    usedSlugs.add(slug);
    toInsert.push(buildTrendingInsert(coin, listDate, sortOrder++, "24h search + meme category"));
  }

  const fillNeeded = Math.max(DAILY_MEME_COIN_TARGET - rows.length - toInsert.length, 0);
  for (let i = 0; i < fillNeeded; i++) {
    toInsert.push(generateLiveMemeCoin(listDate, sortOrder++, usedSlugs));
  }

  if (toInsert.length === 0) {
    return {
      listDate,
      inserted: 0,
      skipped: rows.length,
      trending: rows.filter((r) => r.source === "trending").length,
      generated: rows.filter((r) => !r.coingecko_id).length,
      total: rows.length,
    };
  }

  const { error: insertError } = await supabase.from("daily_meme_coins").upsert(toInsert, {
    onConflict: "list_date,slug",
    ignoreDuplicates: false,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  const trendingCount = toInsert.filter((r) => r.coingecko_id).length;
  const generatedCount = toInsert.filter((r) => !r.coingecko_id).length;

  return {
    listDate,
    inserted: toInsert.length,
    skipped: rows.length,
    trending: trendingCount,
    generated: generatedCount,
    total: rows.length + toInsert.length,
  };
}

export async function refreshTrendingPrices(
  supabase: SupabaseClient,
  listDate: string
): Promise<number> {
  const { data: rows, error } = await supabase
    .from("daily_meme_coins")
    .select("id, coingecko_id, admin_price_locked")
    .eq("list_date", listDate)
    .eq("source", "trending")
    .eq("admin_price_locked", false)
    .not("coingecko_id", "is", null);

  if (error || !rows?.length) return 0;

  const ids = [...new Set(rows.map((r) => r.coingecko_id).filter(Boolean))].join(",");
  if (!ids) return 0;

  const headers: HeadersInit = {};
  const demoKey = process.env.COINGECKO_API_KEY;
  if (demoKey) headers["x-cg-demo-api-key"] = demoKey;

  const url = new URL("https://api.coingecko.com/api/v3/simple/price");
  url.searchParams.set("ids", ids);
  url.searchParams.set("vs_currencies", "usd");
  url.searchParams.set("include_24hr_change", "true");
  url.searchParams.set("include_market_cap", "true");

  const res = await fetch(url.toString(), { headers, next: { revalidate: 300 } });
  if (!res.ok) return 0;

  const payload = (await res.json()) as Record<
    string,
    { usd?: number; usd_24h_change?: number; usd_market_cap?: number }
  >;

  let updated = 0;
  for (const row of rows) {
    const live = row.coingecko_id ? payload[row.coingecko_id] : undefined;
    if (!live?.usd) continue;

    const { error: updateError } = await supabase
      .from("daily_meme_coins")
      .update({
        price_usd: live.usd,
        change_24h: live.usd_24h_change ?? null,
        market_cap_usd: live.usd_market_cap ?? null,
      })
      .eq("id", row.id);

    if (!updateError) updated++;
  }

  return updated;
}
