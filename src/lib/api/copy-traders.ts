import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapCopyTraderRow,
  type CopyTraderProfile,
  type CopyTraderRow,
  type TraderAvatarKind,
} from "@/lib/copy-traders";

const SELECT_COLS =
  "id, name, handle, bio, roi, followers, win_rate, rating, avatar_kind, avatar_seed, ring_color, verified, badge, section_id, sort_order, price, is_active, created_at, updated_at";

function asRows(data: unknown): CopyTraderRow[] {
  return (data ?? []) as CopyTraderRow[];
}

export async function getCopyTraders(
  supabase: SupabaseClient,
  opts?: { activeOnly?: boolean }
): Promise<CopyTraderProfile[]> {
  let query = supabase
    .from("copy_traders")
    .select(SELECT_COLS)
    .order("section_id")
    .order("sort_order")
    .order("name");

  if (opts?.activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return asRows(data).map(mapCopyTraderRow);
}

export type CopyTraderInput = {
  name: string;
  handle: string;
  bio: string;
  roi: number;
  followers: number;
  winRate: number;
  rating: number;
  avatarKind: TraderAvatarKind;
  avatarSeed: string;
  ringColor: string;
  verified: boolean;
  badge: string;
  sectionId: string;
  sortOrder: number;
  price: number;
  isActive: boolean;
};

function clamp(value: number, min: number, max: number, fallback = min) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function toRow(input: CopyTraderInput) {
  return {
    name: input.name.trim(),
    handle: input.handle.trim(),
    bio: input.bio.trim(),
    roi: Number.isFinite(input.roi) ? input.roi : 0,
    followers: Math.max(0, Math.round(Number(input.followers) || 0)),
    win_rate: clamp(Number(input.winRate), 0, 100, 0),
    rating: clamp(Math.round(Number(input.rating) * 100) / 100, 0, 5, 4.5),
    avatar_kind: input.avatarKind,
    avatar_seed: input.avatarSeed.trim() || "trader",
    ring_color: input.ringColor.trim() || "#6366f1",
    verified: input.verified,
    badge: input.badge.trim() || null,
    section_id: input.sectionId.trim() || "featured",
    sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
    price: input.price,
    is_active: input.isActive,
  };
}

export async function createCopyTrader(
  supabase: SupabaseClient,
  input: CopyTraderInput
): Promise<CopyTraderProfile> {
  const { data, error } = await supabase
    .from("copy_traders")
    .insert(toRow(input))
    .select(SELECT_COLS)
    .single();

  if (error) throw new Error(error.message);
  return mapCopyTraderRow(data as CopyTraderRow);
}

export async function updateCopyTrader(
  supabase: SupabaseClient,
  id: string,
  input: CopyTraderInput
): Promise<CopyTraderProfile> {
  const { data, error } = await supabase
    .from("copy_traders")
    .update(toRow(input))
    .eq("id", id)
    .select(SELECT_COLS)
    .single();

  if (error) throw new Error(error.message);
  return mapCopyTraderRow(data as CopyTraderRow);
}

export async function deleteCopyTrader(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("copy_traders").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
