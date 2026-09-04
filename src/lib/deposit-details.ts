import { DEPOSIT_CRYPTO_KEYS, getGiftCardBrand } from "@/lib/deposit-options";

export type GiftCardDepositMeta = {
  type: "gift_card";
  cardCode?: string;
  additionalNotes?: string | null;
  frontImageUrl?: string;
  backImageUrl?: string | null;
};

export type PlainDepositMeta = {
  type: "plain";
  text?: string;
  proofImageUrl?: string;
  txHash?: string;
};

export type ParsedDepositNotes = GiftCardDepositMeta | PlainDepositMeta;

export function parseDepositNotes(notes: string | null | undefined, method: string): ParsedDepositNotes {
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

      const text =
        typeof data.text === "string"
          ? data.text
          : typeof data.label === "string"
            ? data.spot_wallet_deposit
              ? `Spot wallet deposit · ${data.label}`
              : data.label
            : undefined;
      const proofImageUrl = typeof data.proofImageUrl === "string" ? data.proofImageUrl : undefined;
      const txHash = typeof data.txHash === "string" ? data.txHash : undefined;

      if (text || proofImageUrl || txHash) {
        return { type: "plain", text, proofImageUrl, txHash };
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

export function depositNotesHaveImages(meta: ParsedDepositNotes): boolean {
  if (meta.type === "gift_card") return Boolean(meta.frontImageUrl || meta.backImageUrl);
  return Boolean(meta.proofImageUrl);
}

export function getGiftCardBrandFromMethod(method: string) {
  if (!method.startsWith("gift_card_")) return null;
  return getGiftCardBrand(method.replace("gift_card_", "")) ?? null;
}
