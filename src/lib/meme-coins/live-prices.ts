import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemeCoinRow } from "@/lib/meme-coins/types";

export type MemePriceTick = {
  priceUsd: number;
  change24h: number | null;
  marketCapUsd: number | null;
};

function hashCoinSeed(coinId: string): number {
  let hash = 0;
  for (let i = 0; i < coinId.length; i++) {
    hash = (hash * 31 + coinId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Deterministic 0–1 noise for a coin at a given time bucket. */
export function memePriceNoise(coinId: string, bucket: number): number {
  const seed = hashCoinSeed(coinId);
  const x = Math.sin(seed * 12.9898 + bucket * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function coinVolatility(coin: Pick<MemeCoinRow, "id" | "coingecko_id" | "change_24h">): number {
  const seed = hashCoinSeed(coin.id);
  const base = coin.coingecko_id ? 0.0018 : 0.006;
  const changeBoost = Math.min(Math.abs(coin.change_24h ?? 0) / 100, 0.04);
  return base + (seed % 120) / 100000 + changeBoost * 0.15;
}

/**
 * Smooth client-side price from a server anchor — same result for all users at the same moment.
 */
export function computeLiveMemePrice(
  coin: Pick<MemeCoinRow, "id" | "price_usd" | "change_24h" | "admin_price_locked" | "coingecko_id">,
  anchorTimeMs: number,
  nowMs = Date.now()
): number {
  const anchor = Number(coin.price_usd ?? 0);
  if (anchor <= 0) return 0;
  if (coin.admin_price_locked) return anchor;

  const elapsedSec = Math.max(0, (nowMs - anchorTimeMs) / 1000);
  const vol = coinVolatility(coin);
  const biasPerSec = (coin.change_24h ?? 0) / 100 / 86400;
  const seed = hashCoinSeed(coin.id);

  let drift = biasPerSec * elapsedSec;
  drift += Math.sin(elapsedSec / 7 + seed * 0.01) * vol * 0.45;
  drift += Math.sin(elapsedSec / 17 + seed * 0.017) * vol * 0.32;
  drift += Math.sin(elapsedSec / 31 + seed * 0.023) * vol * 0.22;
  drift += (memePriceNoise(coin.id, Math.floor(elapsedSec / 2)) - 0.5) * vol * 0.55;

  const maxDrift = coin.coingecko_id ? 0.035 : 0.12;
  drift = Math.max(-maxDrift, Math.min(maxDrift, drift));

  return Math.max(anchor * (1 + drift), anchor * 0.0001);
}

/** Single server-side price tick for one coin row. */
export function applyMemePriceTick(
  coin: Pick<
    MemeCoinRow,
    "id" | "price_usd" | "change_24h" | "market_cap_usd" | "coingecko_id" | "admin_price_locked"
  >
): MemePriceTick | null {
  const price = Number(coin.price_usd ?? 0);
  if (price <= 0 || coin.admin_price_locked) return null;

  const vol = coinVolatility(coin);
  const bucket = Math.floor(Date.now() / 15_000);
  const noise = (memePriceNoise(coin.id, bucket) - 0.5) * 2;
  const bias = (coin.change_24h ?? 0) / 100 / 480;
  const delta = noise * vol + bias;

  const newPrice = Math.max(price * (1 + delta), price * 0.0001);
  const tickPct = ((newPrice - price) / price) * 100;
  const prevChange = coin.change_24h ?? tickPct;
  const newChange = prevChange * 0.992 + tickPct * 0.35;

  let marketCap = coin.market_cap_usd;
  if (marketCap != null && marketCap > 0) {
    marketCap = Number((marketCap * (newPrice / price)).toFixed(2));
  }

  return {
    priceUsd: Number(newPrice.toFixed(Math.min(12, newPrice < 0.0001 ? 10 : 8))),
    change24h: Number(newChange.toFixed(2)),
    marketCapUsd: marketCap,
  };
}

export type MemePriceTickResult = {
  ticked: number;
  skipped: number;
};

const TICK_MIN_AGE_MS = 25_000;

/** Advance prices for all unlocked active coins on today's list. */
export async function tickMemeCoinPrices(
  supabase: SupabaseClient,
  listDate: string
): Promise<MemePriceTickResult> {
  const staleBefore = new Date(Date.now() - TICK_MIN_AGE_MS).toISOString();

  const { data: rows, error } = await supabase
    .from("daily_meme_coins")
    .select("id, price_usd, change_24h, market_cap_usd, coingecko_id, admin_price_locked, updated_at")
    .eq("list_date", listDate)
    .eq("status", "active")
    .eq("admin_price_locked", false)
    .lt("updated_at", staleBefore);

  if (error || !rows?.length) {
    return { ticked: 0, skipped: rows?.length ?? 0 };
  }

  let ticked = 0;
  for (const row of rows) {
    const next = applyMemePriceTick(row as MemeCoinRow);
    if (!next) continue;

    const { error: updateError } = await supabase
      .from("daily_meme_coins")
      .update({
        price_usd: next.priceUsd,
        change_24h: next.change24h,
        market_cap_usd: next.marketCapUsd,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (!updateError) ticked++;
  }

  return { ticked, skipped: rows.length - ticked };
}

export function mergeLiveMemeCoin<T extends MemeCoinRow>(
  coin: T,
  livePrice: number,
  anchorTimeMs: number
): T {
  const anchor = Number(coin.price_usd ?? 0);
  const sessionPct =
    anchor > 0 ? ((livePrice - anchor) / anchor) * 100 : 0;
  const blendedChange =
    coin.change_24h != null
      ? coin.change_24h + sessionPct * 0.08
      : sessionPct;

  return {
    ...coin,
    price_usd: livePrice,
    change_24h: Number(blendedChange.toFixed(2)),
  };
}
