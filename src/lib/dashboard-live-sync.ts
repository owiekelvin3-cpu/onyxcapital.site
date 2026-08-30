/** Dispatched when balance, profit, or copy subscriptions change on the server. */
export const DASHBOARD_REFRESH_EVENT = "onyx:dashboard-refresh";

export function emitDashboardRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DASHBOARD_REFRESH_EVENT));
}
