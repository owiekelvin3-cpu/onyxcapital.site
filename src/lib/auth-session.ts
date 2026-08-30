import { createClient } from "@/lib/supabase/client";

const JWT_EXPIRED_RE =
  /jwt expired|invalid jwt|invalid claim|exp["']?\s*claim|timestamp check failed|session missing|refresh.?token|not authenticated|token is expired|PGRST301/i;

const REFRESH_SKEW_SECONDS = 180;

let refreshInFlight: Promise<boolean> | null = null;

function errorText(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const parts: string[] = [];
    if ("message" in error) parts.push(String((error as { message: unknown }).message));
    if ("error" in error) parts.push(String((error as { error: unknown }).error));
    if ("error_description" in error) {
      parts.push(String((error as { error_description: unknown }).error_description));
    }
    return parts.join(" ");
  }
  return String(error);
}

export function isJwtExpiredError(error: unknown): boolean {
  return JWT_EXPIRED_RE.test(errorText(error));
}

export function formatAuthError(
  error: unknown,
  fallback = "Your session expired. Please sign in again."
): string {
  if (!error) return fallback;
  if (isJwtExpiredError(error)) return fallback;
  const text = errorText(error).trim();
  return text || fallback;
}

async function doRefreshSession(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return false;

  const expiresAt = session.expires_at ?? 0;
  const now = Math.floor(Date.now() / 1000);
  const secondsLeft = expiresAt - now;

  if (secondsLeft > REFRESH_SKEW_SECONDS) return true;

  const { error: userError } = await supabase.auth.getUser();
  if (!userError && secondsLeft > 30) return true;

  const { data, error } = await supabase.auth.refreshSession();
  if (!error && data.session) return true;

  await new Promise((r) => setTimeout(r, 400));
  const retry = await supabase.auth.refreshSession();
  return !retry.error && !!retry.data.session;
}

export async function ensureValidSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefreshSession().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function forceRefreshSession(): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.refreshSession();
  if (!error && data.session) return true;
  await new Promise((r) => setTimeout(r, 300));
  const retry = await supabase.auth.refreshSession();
  return !retry.error && !!retry.data.session;
}
