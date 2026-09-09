export const CARD_DEPOSIT_METHOD = "credit_card";

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCardNumberInput(value: string) {
  return digitsOnly(value)
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export function formatExpiryInput(value: string) {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function cardBrandFromNumber(number: string) {
  const n = digitsOnly(number);
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]/.test(n) || /^2(2[2-9]|[3-6]|7[01]|720)/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "American Express";
  if (/^6(?:011|5)/.test(n)) return "Discover";
  return "Card";
}

export function luhnValid(number: string) {
  const n = digitsOnly(number);
  if (n.length < 13 || n.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = n.length - 1; i >= 0; i -= 1) {
    let d = Number(n[i]);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function parseCardExpiry(value: string) {
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return null;
  const now = new Date();
  const expiry = new Date(year, month, 0, 23, 59, 59);
  if (expiry < new Date(now.getFullYear(), now.getMonth(), 1)) return null;
  return { month, year, label: `${match[1]}/${match[2]}` };
}

export function validateCardDeposit(params: {
  amount: string;
  cardNumber: string;
  cardholderName: string;
  expiry: string;
  cvv: string;
}) {
  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount < 50) {
    return "Minimum deposit is $50";
  }
  if (!luhnValid(params.cardNumber)) {
    return "Enter a valid card number.";
  }
  if (params.cardholderName.trim().length < 2) {
    return "Enter the cardholder name.";
  }
  if (!parseCardExpiry(params.expiry)) {
    return "Enter a valid expiry date (MM/YY).";
  }
  const cvv = digitsOnly(params.cvv);
  if (cvv.length < 3 || cvv.length > 4) {
    return "Enter a valid CVV.";
  }
  return null;
}
