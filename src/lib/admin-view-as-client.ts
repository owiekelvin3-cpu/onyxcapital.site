import { VIEWING_AS_FLAG } from "@/lib/admin-view-as-cookie";

export function isViewingAsUser() {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((part) => part.startsWith(`${VIEWING_AS_FLAG}=`));
}

/** Restore the admin session and leave the user's dashboard. */
export async function returnToAdmin() {
  const res = await fetch("/api/admin/view-as/exit", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return false;
  window.location.href = "/admin/users";
  return true;
}
