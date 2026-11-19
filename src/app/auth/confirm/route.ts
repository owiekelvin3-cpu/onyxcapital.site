import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { hasSupabaseEnv } from "@/lib/env";

const OTP_TYPES = new Set<EmailOtpType>(["recovery", "signup", "magiclink", "email", "invite"]);

/**
 * Open an emailed reset or confirm link, store the session, and continue.
 * The token hash never stays in the browser address bar after this redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/reset-password";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/reset-password";
  const failed = `${origin}/forgot-password?error=link`;

  if (!tokenHash || !type || !OTP_TYPES.has(type) || !hasSupabaseEnv()) {
    return NextResponse.redirect(failed);
  }

  let response = NextResponse.redirect(`${origin}${safeNext}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.redirect(`${origin}${safeNext}`);
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return NextResponse.redirect(failed);

  return response;
}
