import type { SupabaseClient } from "@supabase/supabase-js";
import type { DepositRow } from "@/lib/supabase/types";
import {
  DEFAULT_CRYPTO_PARTNERS,
  DEFAULT_GIFT_CARD_PARTNERS,
  type PurchasePartner,
} from "@/lib/deposit-options";

export type DepositConfig = {
  cryptoWallets: Record<string, string>;
  cryptoPartners?: PurchasePartner[];
  giftCardPartners?: PurchasePartner[];
};

function mergePartners(raw: unknown, fallback: PurchasePartner[]): PurchasePartner[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  return raw
    .filter((p): p is PurchasePartner => typeof p === "object" && p !== null && "id" in p && "url" in p)
    .map((p) => ({
      id: String(p.id),
      name: String(p.name ?? p.id),
      url: String(p.url),
      color: String(p.color ?? "#2563EB"),
      description: p.description ? String(p.description) : undefined,
      descriptionKey: p.descriptionKey ? String(p.descriptionKey) : undefined,
      logoUrl: p.logoUrl ? String(p.logoUrl) : undefined,
      tag: p.tag ? String(p.tag) : undefined,
      tagKey: p.tagKey ? String(p.tagKey) : undefined,
      enabled: p.enabled !== false,
    }));
}

export async function getDepositConfig(
  supabase: SupabaseClient
): Promise<DepositConfig | null> {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "deposit_config")
    .maybeSingle();

  const raw = (data?.value as Partial<DepositConfig> | null) ?? null;
  if (!raw) return null;

  return {
    cryptoWallets: raw.cryptoWallets ?? {},
    cryptoPartners: mergePartners(raw.cryptoPartners, DEFAULT_CRYPTO_PARTNERS),
    giftCardPartners: mergePartners(raw.giftCardPartners, DEFAULT_GIFT_CARD_PARTNERS),
  };
}

export async function getUserDeposits(
  supabase: SupabaseClient,
  userId: string
): Promise<DepositRow[]> {
  const { data, error } = await supabase
    .from("deposits")
    .select("id, user_id, amount, currency, method, status, notes, rejection_reason, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return (data ?? []) as DepositRow[];
}

export async function submitDeposit(
  supabase: SupabaseClient,
  params: {
    userId: string;
    amount: number;
    method: string;
    notes?: string;
    relatedFeeId?: string;
    currency?: string;
  }
): Promise<DepositRow> {
  const { data, error } = await supabase
    .from("deposits")
    .insert({
      user_id: params.userId,
      amount: params.amount,
      currency: params.currency ?? "USD",
      method: params.method,
      status: "pending",
      notes: params.notes ?? null,
      related_fee_id: params.relatedFeeId ?? null,
    })
    .select("id, user_id, amount, currency, method, status, notes, rejection_reason, created_at")
    .single();

  if (error) throw new Error(error.message);
  return data as DepositRow;
}

export async function uploadGiftCardImage(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  side: "front" | "back"
): Promise<string> {
  const safeName = file.name.replace(/[^\w.-]+/g, "_");
  const path = `${userId}/gift-cards/${Date.now()}-${side}-${safeName}`;
  const { error } = await supabase.storage.from("kyc-documents").upload(path, file);
  if (error) throw new Error(error.message);
  return path;
}

export async function submitGiftCardDeposit(
  supabase: SupabaseClient,
  params: {
    userId: string;
    brandId: string;
    amount: number;
    cardCode: string;
    frontImage: File;
    backImage?: File | null;
    additionalNotes?: string;
    currency?: string;
    relatedFeeId?: string;
  }
): Promise<DepositRow> {
  const [frontImageUrl, backImageUrl] = await Promise.all([
    uploadGiftCardImage(supabase, params.userId, params.frontImage, "front"),
    params.backImage
      ? uploadGiftCardImage(supabase, params.userId, params.backImage, "back")
      : Promise.resolve(null),
  ]);

  const notes = JSON.stringify({
    cardCode: params.cardCode.trim(),
    additionalNotes: params.additionalNotes?.trim() || null,
    frontImageUrl,
    backImageUrl,
  });

  return submitDeposit(supabase, {
    userId: params.userId,
    amount: params.amount,
    method: `gift_card_${params.brandId}`,
    notes,
    currency: params.currency ?? "USD",
    relatedFeeId: params.relatedFeeId,
  });
}
