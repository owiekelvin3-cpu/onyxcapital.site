import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE } from "@/lib/auth-guards";
import {
  ADMIN_RETURN_COOKIE,
  VIEWING_AS_FLAG,
  adminViewCookieOptions,
  openAdminReturn,
  viewingAsFlagOptions,
} from "@/lib/admin-view-as";

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

function clearViewCookies(response: NextResponse) {
  response.cookies.set(ADMIN_RETURN_COOKIE, "", { ...adminViewCookieOptions(), maxAge: 0 });
  response.cookies.set(VIEWING_AS_FLAG, "", { ...viewingAsFlagOptions(), maxAge: 0 });
}

export async function POST() {
  const cookieStore = await cookies();
  const sealed = cookieStore.get(ADMIN_RETURN_COOKIE)?.value;
  if (!sealed) {
    return NextResponse.json({ error: "You are not viewing a user" }, { status: 400 });
  }

  let refreshToken: string;
  try {
    refreshToken = openAdminReturn(sealed);
  } catch {
    const response = NextResponse.json({ error: "Could not return to admin" }, { status: 400 });
    clearViewCookies(response);
    return response;
  }

  const response = NextResponse.json({ ok: true, redirect: "/admin/users" });
  const supabase = await createRouteSupabase(response);
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data.session) {
    return NextResponse.json(
      { error: "Could not return to admin. Sign in on the team page." },
      { status: 401 }
    );
  }

  clearViewCookies(response);
  response.cookies.set(ADMIN_AUTH_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });

  return response;
}
