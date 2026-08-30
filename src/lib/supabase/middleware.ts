import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_AUTH_COOKIE, isAdminPanelPath } from "@/lib/auth-guards";

async function fetchRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
) {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return data?.role ?? null;
}

function hasAdminSession(request: NextRequest) {
  return request.cookies.get(ADMIN_AUTH_COOKIE)?.value === "1";
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAdminLogin = pathname === "/admin/login";
  const isAdminPanel = isAdminPanelPath(pathname);
  const adminSession = hasAdminSession(request);

  // Regular login must not be used as a back door to the team console
  if (pathname === "/login") {
    const redirectTarget = request.nextUrl.searchParams.get("redirect");
    if (redirectTarget && isAdminPanelPath(redirectTarget)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  const emailVerified = Boolean(user?.email_confirmed_at);

  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && !emailVerified && (pathname.startsWith("/dashboard") || isAdminPanel)) {
    const url = request.nextUrl.clone();
    url.pathname = "/verify-email";
    url.search = "";
    if (user.email) url.searchParams.set("email", user.email);
    return NextResponse.redirect(url);
  }

  if (isAdminPanel) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    const role = await fetchRole(supabase, user.id);
    if (role !== "admin" || !adminSession) {
      const url = request.nextUrl.clone();
      url.pathname = role === "admin" ? "/admin/login" : "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (isAdminLogin && user) {
    const role = await fetchRole(supabase, user.id);
    if (role === "admin" && adminSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }

  if (user && emailVerified && (pathname === "/login" || pathname === "/register" || pathname === "/verify-email")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && !emailVerified && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/verify-email";
    url.search = "";
    if (user.email) url.searchParams.set("email", user.email);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
