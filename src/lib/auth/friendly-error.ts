/** Map raw auth/mailer errors to a short message users can act on. */
export function friendlyAuthError(
  message: string | undefined,
  fallback = "Something went wrong. Please try again."
) {
  const text = (message ?? "").trim();
  const lower = text.toLowerCase();

  if (!text) return fallback;
  if (/rate limit|too many|over_email|email rate|429/.test(lower)) {
    return fallback;
  }
  if (/invalid login|invalid credentials|invalid email or password/.test(lower)) {
    return "Email or password is incorrect.";
  }
  if (/already|registered|exists/.test(lower)) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (/not confirmed|confirm/.test(lower)) {
    return "Verify your email before signing in.";
  }

  return text;
}
