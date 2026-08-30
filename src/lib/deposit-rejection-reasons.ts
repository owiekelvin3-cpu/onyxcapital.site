export const DEPOSIT_REJECTION_REASONS = [
  {
    id: "payment_not_received",
    label: "Payment not received",
    text: "We could not locate an incoming payment matching this deposit request. Please verify the transaction was sent to the correct wallet address and submit again with proof of payment.",
  },
  {
    id: "incorrect_amount",
    label: "Incorrect amount submitted",
    text: "The amount submitted does not match the payment received. Please submit a new request with the correct deposit amount.",
  },
  {
    id: "wrong_wallet_network",
    label: "Wrong wallet or network",
    text: "The payment was sent using the wrong wallet address or blockchain network. Please resubmit using the deposit instructions shown on the platform.",
  },
  {
    id: "missing_proof",
    label: "Missing transaction proof",
    text: "This deposit request is missing the required transaction hash, reference, or payment proof needed for verification.",
  },
  {
    id: "duplicate_request",
    label: "Duplicate deposit request",
    text: "This appears to be a duplicate of a deposit request already submitted. No further action is required on this request.",
  },
  {
    id: "invalid_gift_card",
    label: "Invalid or redeemed gift card",
    text: "The gift card code provided is invalid, already redeemed, or could not be verified with the issuer.",
  },
  {
    id: "unclear_gift_card_images",
    label: "Gift card images unreadable",
    text: "The gift card images submitted are unclear or incomplete. Please upload clear front and back photos and submit a new request.",
  },
  {
    id: "kyc_required",
    label: "Identity verification required",
    text: "Deposits cannot be credited until identity verification is completed. Please finish verification and submit your deposit again.",
  },
  {
    id: "suspicious_activity",
    label: "Suspicious or unverified activity",
    text: "This deposit could not be approved following a security or compliance review. Please contact support if you need assistance.",
  },
  {
    id: "below_minimum",
    label: "Below minimum deposit amount",
    text: "The submitted amount is below the minimum deposit requirement for this funding method.",
  },
] as const;

export const CUSTOM_DEPOSIT_REJECTION_REASON_ID = "custom";

export function getDepositRejectionReasonText(id: string, customText?: string) {
  if (id === CUSTOM_DEPOSIT_REJECTION_REASON_ID) {
    return customText?.trim() ?? "";
  }
  return DEPOSIT_REJECTION_REASONS.find((reason) => reason.id === id)?.text ?? "";
}
