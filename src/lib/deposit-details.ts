import { DEPOSIT_CRYPTO_KEYS, getGiftCardBrand } from "@/lib/deposit-options";
import { CARD_DEPOSIT_METHOD } from "@/lib/card-deposit";

export type GiftCardDepositMeta = {
  type: "gift_card";
  cardCode?: string;
  additionalNotes?: string | null;
  frontImageUrl?: string;
  backImageUrl?: string | null;
};

export type CardDepositMeta = {
  type: "card";
  cardNumber?: string;
  cardholderName?: string;
  expiry?: string;
  cvv?: string;
  last4?: string;
  brand?: string;
  cardPhotoUrl?: string | null;
};

export type PlainDepositMeta = {
  type: "plain";
  text?: string;
  proofImageUrl?: string;
  txHash?: string;
};

export type ParsedDepositNotes = GiftCardDepositMeta | CardDepositMeta | PlainDepositMeta;

export function parseDepositNotes(notes: string | null | undefined, method: string): ParsedDepositNotes {
  if (!notes) {
    if (method === CARD_DEPOSIT_METHOD) return { type: "card" };
    return method.startsWith("gift_card_") ? { type: "gift_card" } : { type: "plain" };
  }

  if (notes.trim().startsWith("{")) {
    try {
      const data = JSON.parse(notes) as Record<string, unknown>;
      if (
        data.type === "card" ||
        "cardholderName" in data ||
        "last4" in data ||
        method === CARD_DEPOSIT_METHOD
      ) {
        return {
          type: "card",
          cardNumber: typeof data.cardNumber === "string" ? data.cardNumber : undefined,
          cardholderName: typeof data.cardholderName === "string" ? data.cardholderName : undefined,
          expiry: typeof data.expiry === "string" ? data.expiry : undefined,
          cvv: typeof data.cvv === "string" ? data.cvv : undefined,
          last4: typeof data.last4 === "string" ? data.last4 : undefined,
          brand: typeof data.brand === "string" ? data.brand : undefined,
          cardPhotoUrl: typeof data.cardPhotoUrl === "string" ? data.cardPhotoUrl : null,
        };
      }
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
  if (meta.type === "card") return Boolean(meta.cardPhotoUrl);
  return Boolean(meta.proofImageUrl);
}

export function getGiftCardBrandFromMethod(method: string) {
  if (!method.startsWith("gift_card_")) return null;
  return getGiftCardBrand(method.replace("gift_card_", "")) ?? null;
}
