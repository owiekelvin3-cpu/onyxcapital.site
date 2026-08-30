import { DEPOSIT_CRYPTO_KEYS, getGiftCardBrand } from "@/lib/deposit-options";

export type GiftCardDepositMeta = {
  type: "gift_card";
  cardCode?: string;
  additionalNotes?: string | null;
  frontImageUrl?: string;
  backImageUrl?: string | null;
};

export type ParsedDepositNotes = GiftCardDepositMeta | { type: "plain"; text?: string };

export function parseDepositNotes(notes: string | null, method: string): ParsedDepositNotes {
  if (!notes) {
    return method.startsWith("gift_card_") ? { type: "gift_card" } : { type: "plain" };
  }

  if (notes.trim().startsWith("{")) {
    try {
      const data = JSON.parse(notes) as Record<string, unknown>;
      if ("frontImageUrl" in data || "cardCode" in data) {
        return {
          type: "gift_card",
          cardCode: typeof data.cardCode === "string" ? data.cardCode : undefined,
          additionalNotes: typeof data.additionalNotes === "string" ? data.additionalNotes : null,
          frontImageUrl: typeof data.frontImageUrl === "string" ? data.frontImageUrl : undefined,
          backImageUrl: typeof data.backImageUrl === "string" ? data.backImageUrl : null,
        };
      }
    } catch {
      /* fall through */
    }
  }

  if (method.startsWith("crypto_") || DEPOSIT_CRYPTO_KEYS.includes(method)) {
    return { type: "plain", text: notes };
  }

  return { type: "plain", text: notes };
}

export function getGiftCardBrandFromMethod(method: string) {
  if (!method.startsWith("gift_card_")) return null;
  return getGiftCardBrand(method.replace("gift_card_", "")) ?? null;
}
