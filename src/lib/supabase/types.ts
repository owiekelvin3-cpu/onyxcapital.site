/** Core Supabase table shapes used by the Onyx Capital frontend */

export type TradeRow = {
  id: string;
  user_id: string;
  asset: string;
  type: "buy" | "sell";
  amount: number;
  price: number;
  status: string;
  profit?: number | null;
  created_at: string;
};

export type HoldingRow = {
  id: string;
  user_id: string;
  asset: string;
  quantity: number;
  updated_at: string;
};

export type BalanceRow = {
  id: string;
  user_id: string;
  currency: string;
  amount: number;
};

export type DepositRow = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  notes?: string | null;
  rejection_reason?: string | null;
  created_at: string;
};

export type WithdrawalRow = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: string;
  wallet_address?: string | null;
  status: string;
  notes?: string | null;
  rejection_reason?: string | null;
  created_at: string;
};

export type AiSubscriptionRow = {
  id: string;
  user_id: string;
  bot_id?: string | null;
  bot_name: string;
  allocation: number;
  duration_hours?: number | null;
  expires_at?: string | null;
  crypto_asset?: string | null;
  market: string;
  status: string;
  profit_earned?: number | null;
  entry_price?: number | null;
  last_mark_price?: number | null;
  admin_pnl?: number | null;
  last_sync_at?: string | null;
  purchase_cost?: number | null;
  created_at: string;
};

export type CopySubscriptionRow = {
  id: string;
  user_id: string;
  trader_name: string;
  allocation: number;
  profit_earned?: number;
  status: string;
  created_at: string;
};

export type WithdrawalEligibility = {
  portfolio: Record<string, unknown>;
  pending_fees_count: number;
  can_withdraw: boolean;
  is_suspended?: boolean;
  suspension_reason?: string | null;
  kyc_status?: string;
  kyc_approved?: boolean;
};

export type ProfileRow = {
  id: string;
  email: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  country?: string | null;
  address?: string | null;
  date_of_birth?: string | null;
  kyc_status: string;
  role: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

export type TransactionKind = "deposit" | "withdrawal" | "trade";

export type TransactionItem = {
  id: string;
  kind: TransactionKind;
  status: string;
  created_at: string;
  updated_at: string;
  amount: number;
  currency: string;
  method?: string | null;
  asset?: string | null;
  tradeType?: "buy" | "sell" | null;
  quantity?: number | null;
  unitPrice?: number | null;
  destination?: string | null;
  notes?: string | null;
};

export type SignalPackageRow = {
  id: string;
  user_id: string;
  package_name: string;
  package_id?: string | null;
  price: number;
  status: string;
  expires_at?: string | null;
  admin_granted?: boolean;
  created_at: string;
};

export type TradingSignalRow = {
  id: string;
  symbol: string;
  direction: "buy" | "sell";
  entry_price: string;
  target_price: string;
  stop_price: string;
  status: string;
  min_tier: string;
  confidence: number;
  outcome?: string | null;
  notes?: string | null;
  published_at: string;
  closed_at?: string | null;
};

export type DailyMemeCoinRow = {
  id: string;
  list_date: string;
  symbol: string;
  name: string;
  slug: string;
  source: "trending" | "northline_generated" | "admin_manual";
  coingecko_id: string | null;
  price_usd: number | null;
  change_24h: number | null;
  market_cap_usd: number | null;
  image_url: string | null;
  description: string | null;
  tags: string[];
  featured: boolean;
  status: "active" | "archived";
  admin_price_locked?: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type MemeHoldingRow = {
  id: string;
  user_id: string;
  meme_coin_id: string;
  quantity: number;
  avg_cost_usd: number | null;
  updated_at: string;
};

export type MemeTradeRow = {
  id: string;
  user_id: string;
  meme_coin_id: string;
  type: "buy" | "sell";
  quantity: number;
  price_usd: number;
  status: string;
  created_at: string;
};
