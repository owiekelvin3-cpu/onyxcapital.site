import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false as const, status: 401, error: "Not authenticated" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false as const, status: 500, error: "Could not verify team access" };
  }

  if (profile?.role !== "admin") {
    return { ok: false as const, status: 403, error: "This account does not have team access" };
  }

  return { ok: true as const, user };
}
