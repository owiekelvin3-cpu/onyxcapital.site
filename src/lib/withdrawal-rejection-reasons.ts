export const WITHDRAWAL_REJECTION_REASONS = [
  {
    id: "incomplete_details",
    label: "Incomplete payout details",
    text: "The payout details provided are incomplete or could not be verified. Please review the beneficiary information and submit a new request.",
  },
  {
    id: "name_mismatch",
    label: "Account name mismatch",
    text: "The beneficiary name does not match the verified account holder. Payouts can only be sent to an account held in your registered name.",
  },
  {
    id: "kyc_incomplete",
    label: "Identity verification incomplete",
    text: "Identity verification is incomplete or could not be confirmed for this payout. Complete verification and resubmit your request.",
  },
  {
    id: "account_too_new",
    label: "Account holding period not met",
    text: "This account has not yet completed the required holding period for withdrawals. Please allow additional time from account opening before submitting a new request.",
  },
  {
    id: "portfolio_requirements",
    label: "Portfolio requirements not met",
    text: "Your portfolio has not yet met the minimum requirements for this withdrawal. Please review your current holdings and eligibility before submitting again.",
  },
  {
    id: "minimum_activity",
    label: "Minimum trading activity not met",
    text: "This request cannot be processed until the account has met the minimum trading activity required for withdrawals.",
  },
  {
    id: "open_positions",
    label: "Open positions remaining",
    text: "Funds cannot be released while open positions or pending orders remain on the account. Please close or settle these positions and resubmit.",
  },
  {
    id: "pending_deposits",
    label: "Pending deposits under review",
    text: "One or more deposits on this account are still under review. Withdrawals cannot be processed until those funds have been fully credited.",
  },
  {
    id: "insufficient_balance",
    label: "Insufficient withdrawable balance",
    text: "The requested amount exceeds the available withdrawable balance at the time of review.",
  },
  {
    id: "below_minimum",
    label: "Below minimum withdrawal amount",
    text: "The requested amount is below the minimum withdrawal threshold for the selected payout method.",
  },
  {
    id: "invalid_destination",
    label: "Invalid destination details",
    text: "The destination wallet, account number, or network details are invalid. Please confirm the payout destination and submit again.",
  },
  {
    id: "unsupported_network",
    label: "Unsupported network or corridor",
    text: "The selected network or payout corridor is not supported for this account. Please choose an eligible destination and submit a new request.",
  },
  {
    id: "duplicate_request",
    label: "Duplicate request",
    text: "This appears to be a duplicate of a previously submitted withdrawal. No further action is required on this request.",
  },
  {
    id: "source_of_funds",
    label: "Source of funds unverified",
    text: "The source of funds could not be satisfactorily verified. Please contact support if you wish to provide additional documentation.",
  },
  {
    id: "compliance_review",
    label: "Additional compliance review",
    text: "This request requires additional compliance review before it can be processed. Our team may contact you if further information is needed.",
  },
  {
    id: "security_review",
    label: "Security review required",
    text: "Account activity requires a further security review before funds can be released. Please contact support for assistance.",
  },
  {
    id: "cooling_off",
    label: "Cooling-off period in effect",
    text: "A cooling-off period is currently in effect on this account. Withdrawals will become available once that period has elapsed.",
  },
  {
    id: "outstanding_fees",
    label: "Outstanding fees or charges",
    text: "This withdrawal cannot be processed while outstanding fees or charges remain on the account. Please settle these items and submit a new request.",
  },
  {
    id: "method_unavailable",
    label: "Payout method unavailable",
    text: "This payout method is currently unavailable for the selected corridor. Please choose an alternative method and submit a new request.",
  },
  {
    id: "documentation_required",
    label: "Supporting documentation required",
    text: "Additional supporting documentation is required before this payout can be released. Please contact support to complete the request.",
  },
] as const;

export const CUSTOM_REJECTION_REASON_ID = "custom";

export function getWithdrawalRejectionReasonText(id: string, customText?: string) {
  if (id === CUSTOM_REJECTION_REASON_ID) {
    return customText?.trim() ?? "";
  }
  return WITHDRAWAL_REJECTION_REASONS.find((reason) => reason.id === id)?.text ?? "";
}
