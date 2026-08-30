import { friendlyAuthError } from "@/lib/auth/friendly-error";

export const EMAIL_OTP_LENGTH = 6;
export const EMAIL_OTP_RESEND_SECONDS = 60;

export function signupErrorMessage(message: string | undefined) {
  const lower = (message ?? "").toLowerCase();
  if (/already|registered|exists|duplicate/.test(lower)) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (/rate limit|too many|over_email|email rate/.test(lower)) {
    return "We could not send the verification email just now. Wait a minute and try again.";
  }
  if (/network|fetch/.test(lower)) {
    return "Network error. Check your connection and try again.";
  }
  return friendlyAuthError(message, "Could not create your account. Please try again.");
}

export function verifyOtpErrorMessage(message: string | undefined) {
  const lower = (message ?? "").toLowerCase();
  if (/expired/.test(lower)) {
    return "That code has expired. Request a new one and try again.";
  }
  if (/invalid|otp|token/.test(lower)) {
    return "That code is invalid. Check the 6 digits and try again.";
  }
  if (/already|confirmed|verified/.test(lower)) {
    return "This email is already verified. Sign in to continue.";
  }
  if (/rate limit|too many/.test(lower)) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (/network|fetch/.test(lower)) {
    return "Network error. Check your connection and try again.";
  }
  return friendlyAuthError(message, "Could not verify that code. Try again.");
}

export function resendOtpErrorMessage(message: string | undefined) {
  const lower = (message ?? "").toLowerCase();
  if (/already|confirmed|verified/.test(lower)) {
    return "This email is already verified. Sign in instead.";
  }
  if (/rate limit|too many|over_email|email rate/.test(lower)) {
    return "Please wait before requesting another code.";
  }
  if (/network|fetch/.test(lower)) {
    return "Network error. Check your connection and try again.";
  }
  return friendlyAuthError(message, "Could not resend the code. Try again shortly.");
}

export function isDuplicateSignupUser(user: {
  identities?: Array<unknown> | null;
  email_confirmed_at?: string | null;
} | null) {
  if (!user) return false;
  if (user.email_confirmed_at) return true;
  return Array.isArray(user.identities) && user.identities.length === 0;
}
