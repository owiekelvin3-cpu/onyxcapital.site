import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE } from "@/lib/auth-guards";
import {
  ADMIN_RETURN_COOKIE,
  VIEWING_AS_FLAG,
  adminViewCookieOptions,
  sealAdminReturn,
  viewingAsFlagOptions,
} from "@/lib/admin-view-as";
import { createServiceClient } from "@/lib/supabase/service";

type Body = { userId?: string };

async function createRouteSupabase(response: NextResponse) {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              /* ignore when the cookie store is read-only */
            }
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true, redirect: "/dashboard" });
  const supabase = await createRouteSupabase(response);
  const cookieStore = await cookies();

  if (cookieStore.get(ADMIN_RETURN_COOKIE)?.value) {
    return NextResponse.json(
      { error: "You are already viewing a user. Return to admin first." },
      { status: 409 }
    );
  }

  if (cookieStore.get(ADMIN_AUTH_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Team session required" }, { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "This account does not have team access" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const userId = body.userId?.trim();
  if (!userId) {
    return NextResponse.json({ error: "Choose a user first" }, { status: 400 });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.refresh_token) {
    return NextResponse.json({ error: "Admin session expired. Sign in again." }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: target, error: targetError } = await service.auth.admin.getUserById(userId);
  const email = target.user?.email;
  if (targetError || !email) {
    return NextResponse.json({ error: "That user has no login email" }, { status: 404 });
  }

  const { data: link, error: linkError } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    return NextResponse.json({ error: "Could not open this dashboard" }, { status: 500 });
  }

  const otpType = (link.properties?.verification_type || "magiclink") as EmailOtpType;
  const { error: otpError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: otpType,
  });

  if (otpError) {
    return NextResponse.json({ error: "Could not open this dashboard" }, { status: 500 });
  }

  response.cookies.set(ADMIN_RETURN_COOKIE, sealAdminReturn(session.refresh_token), adminViewCookieOptions());
  response.cookies.set(VIEWING_AS_FLAG, "1", viewingAsFlagOptions());

  return response;
}
