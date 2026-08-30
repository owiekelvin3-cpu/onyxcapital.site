import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_AUTH_COOKIE } from "@/lib/auth-guards";
import { createServiceClient } from "@/lib/supabase/service";
import { refreshTrendingPrices, runDailyMemeCoinSync } from "@/lib/meme-coins/sync";

export const dynamic = "force-dynamic";

async function verifyAdminRequest() {
  const cookieStore = await cookies();
  if (!cookieStore.get(ADMIN_AUTH_COOKIE)?.value) {
    return { ok: false as const, status: 401, error: "Admin session required" };
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, status: 401, error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false as const, status: 403, error: "Admin access required" };
  }

  return { ok: true as const };
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as { force?: boolean };

  try {
    const supabase = createServiceClient();
    const result = await runDailyMemeCoinSync(supabase, { force: body.force === true });
    const refreshed = await refreshTrendingPrices(supabase, result.listDate);

    return NextResponse.json({
      ok: true,
      ...result,
      pricesRefreshed: refreshed,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
