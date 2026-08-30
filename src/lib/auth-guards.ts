/** Team console routes (not the public team sign-in page). */
export function isAdminPanelPath(path: string): boolean {
  return path === "/admin" || (path.startsWith("/admin/") && path !== "/admin/login");
}

export const ADMIN_AUTH_COOKIE = "onyx_admin_auth";

function setAdminAuthCookieClient() {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ADMIN_AUTH_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`;
}

function clearAdminAuthCookieClient() {
  document.cookie = `${ADMIN_AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

/** @deprecated Use establishAdminSession */
export function setAdminAuthCookie() {
  setAdminAuthCookieClient();
}

/** @deprecated Use clearAdminSession */
export function clearAdminAuthCookie() {
  clearAdminAuthCookieClient();
}

export function hasAdminAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((part) => part === `${ADMIN_AUTH_COOKIE}=1`);
}

export async function establishAdminSession(tokens?: {
  access_token: string;
  refresh_token: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/admin/session", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tokens ?? {}),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: body.error ?? "Could not start team session" };
    }

    setAdminAuthCookieClient();
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}

export async function clearAdminSession() {
  try {
    await fetch("/api/admin/session", { method: "DELETE", credentials: "include" });
  } catch {
    /* ignore */
  }
  clearAdminAuthCookieClient();
}
