export const DEPOSIT_CRYPTO_LABELS: Record<string, string> = {
  bitcoin: "Bitcoin (BTC)",
  ethereum: "Ethereum (ETH)",
  usdt: "Tether (USDT)",
  bnb: "BNB",
  solana: "Solana (SOL)",
  xrp: "XRP",
  dogecoin: "Dogecoin (DOGE)",
  litecoin: "Litecoin (LTC)",
};

export const DEPOSIT_CRYPTO_KEYS = Object.keys(DEPOSIT_CRYPTO_LABELS);

export type GiftCardBrand = {
  id: string;
  label: string;
  fullName: string;
  color: string;
  iconUrl: string;
};

export const GIFT_CARD_BRANDS: GiftCardBrand[] = [
  {
    id: "apple",
    label: "Apple",
    fullName: "Apple / iTunes Gift Card",
    color: "#000000",
    iconUrl: "/gift-cards/apple.svg",
  },
  {
    id: "amazon",
    label: "Amazon",
    fullName: "Amazon Gift Card",
    color: "#FF9900",
    iconUrl: "/gift-cards/amazon.svg",
  },
  {
    id: "steam",
    label: "Steam",
    fullName: "Steam Wallet Code",
    color: "#1B2838",
    iconUrl: "/gift-cards/steam.svg",
  },
  {
    id: "google_play",
    label: "Google Play",
    fullName: "Google Play Gift Card",
    color: "#01875F",
    iconUrl: "/gift-cards/google-play.svg",
  },
  {
    id: "visa",
    label: "Visa",
    fullName: "Visa Prepaid Card",
    color: "#1A1F71",
    iconUrl: "/gift-cards/visa.svg",
  },
  {
    id: "mastercard",
    label: "Mastercard",
    fullName: "Mastercard Prepaid Card",
    color: "#EB001B",
    iconUrl: "/gift-cards/mastercard.svg",
  },
];

export type PurchasePartner = {
  id: string;
  name: string;
  description?: string;
  descriptionKey?: string;
  url: string;
  color: string;
  logoUrl?: string;
  tag?: string;
  tagKey?: string;
  enabled?: boolean;
};

export const DEFAULT_CRYPTO_PARTNERS: PurchasePartner[] = [
  {
    id: "moonpay",
    name: "MoonPay",
    descriptionKey: "deposits.partnerMoonPayDesc",
    url: "https://www.moonpay.com/buy",
    color: "#7B3FE4",
    tagKey: "deposits.partnerRecommended",
    enabled: true,
  },
  {
    id: "transak",
    name: "Transak",
    descriptionKey: "deposits.partnerTransakDesc",
    url: "https://global.transak.com",
    color: "#0052FF",
    enabled: true,
  },
];

export const DEFAULT_GIFT_CARD_PARTNERS: PurchasePartner[] = [
  {
    id: "raise",
    name: "Raise",
    descriptionKey: "deposits.partnerRaiseDesc",
    url: "https://www.raise.com",
    color: "#E31837",
    tagKey: "deposits.partnerRecommended",
    enabled: true,
  },
  {
    id: "gyft",
    name: "Gyft",
    descriptionKey: "deposits.partnerGyftDesc",
    url: "https://www.gyft.com",
    color: "#00A4E4",
    enabled: true,
  },
];

export function getGiftCardBrand(brandId: string): GiftCardBrand | undefined {
  return GIFT_CARD_BRANDS.find((b) => b.id === brandId);
}

export function formatDepositMethod(method: string): string {
  if (method.startsWith("gift_card_")) {
    const brandId = method.replace("gift_card_", "");
    const brand = getGiftCardBrand(brandId);
    return brand ? `${brand.label} Gift Card` : "Gift Card";
  }
  if (method.startsWith("crypto_")) {
    const key = method.replace("crypto_", "");
    return DEPOSIT_CRYPTO_LABELS[key] ?? key;
  }
  return method.replace(/_/g, " ");
}

export function isCryptoDepositMethod(method: string): boolean {
  return method.startsWith("crypto_");
}

export function getActivePartners(partners: PurchasePartner[] | undefined): PurchasePartner[] {
  return (partners ?? []).filter((p) => p.enabled !== false);
}
