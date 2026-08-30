import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE } from "@/lib/auth-guards";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

type SessionBody = {
  access_token?: string;
  refresh_token?: string;
};

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
              /* ignore when cookie store is read-only */
            }
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createRouteSupabase>>) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
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

  return { ok: true as const };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SessionBody;
  const response = NextResponse.json({ ok: true });
  const supabase = await createRouteSupabase(response);

  if (body.access_token && body.refresh_token) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: body.access_token,
      refresh_token: body.refresh_token,
    });

    if (sessionError) {
      return NextResponse.json(
        { error: sessionError.message || "Invalid session" },
        { status: 401 }
      );
    }
  } else if (body.access_token) {
    const { error: userError } = await supabase.auth.getUser(body.access_token);
    if (userError) {
      return NextResponse.json(
        { error: userError.message || "Invalid session" },
        { status: 401 }
      );
    }
  }

  const result = await verifyAdmin(supabase);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  response.cookies.set(ADMIN_AUTH_COOKIE, "1", {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_AUTH_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
  return response;
}
