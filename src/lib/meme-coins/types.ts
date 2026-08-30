export type MemeCoinSource = "trending" | "northline_generated" | "admin_manual";

export type MemeCoinStatus = "active" | "archived";

export type MemeCoinRow = {
  id: string;
  list_date: string;
  symbol: string;
  name: string;
  slug: string;
  source: MemeCoinSource;
  coingecko_id: string | null;
  price_usd: number | null;
  change_24h: number | null;
  market_cap_usd: number | null;
  image_url: string | null;
  description: string | null;
  tags: string[];
  featured: boolean;
  status: MemeCoinStatus;
  admin_price_locked?: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type MemeCoinInsert = Omit<
  MemeCoinRow,
  "id" | "created_at" | "updated_at"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export const DAILY_MEME_COIN_TARGET = 10;
export const TRENDING_SLOT_MAX = 7;
export const LIVE_FILL_MIN = 3;
/** @deprecated Use LIVE_FILL_MIN */
export const TECTONEX_SLOT_MIN = LIVE_FILL_MIN;
