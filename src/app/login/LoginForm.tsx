"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth/friendly-error";
import { BRAND } from "@/lib/constants";
import { isAdminPanelPath } from "@/lib/auth-guards";
import { AuthShell, AuthCardHeader } from "@/components/auth/AuthLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthAlert, AuthSubmitButton } from "@/components/auth/auth-motion";
import { Loader2, Lock, Mail } from "@/components/icons";

const REMEMBER_KEY = "onyx_remember_email";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved && !searchParams.get("email")) {
      setEmail(saved);
      setRemember(true);
    }
    if (searchParams.get("message") === "confirm-email") {
      setInfo("Confirm your email with the 6-digit code we sent, then sign in.");
    }
    if (searchParams.get("message") === "account-created") {
      setInfo("Email verified. Sign in to continue.");
    }
    if (searchParams.get("reset") === "1") {
      setInfo("Password updated. Sign in with your new password.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (remember) {
      localStorage.setItem(REMEMBER_KEY, email.trim());
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      if (/not confirmed|confirm/i.test(authError.message)) {
        router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      setError(friendlyAuthError(authError.message, "Could not sign in. Check your email and password."));
      setLoading(false);
      return;
    }

    if (authData.user && !authData.user.email_confirmed_at) {
      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
      return;
    }

    const rawRedirect = searchParams.get("redirect") ?? "/dashboard";
    let redirect = "/dashboard";

    if (!isAdminPanelPath(rawRedirect) && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")) {
      redirect = rawRedirect;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <AuthShell
      panelTitle="Welcome back"
      panelSubtitle="Sign in to view your portfolio, place trades, and manage your account."
    >
      <AuthCardHeader
        title="Log in"
        subtitle={`Access your ${BRAND.name} account`}
        alternate={{
          prompt: "New to Onyx Capital?",
          href: "/register",
          label: "Create free account",
        }}
      />

      <form onSubmit={handleSubmit} className="space-y-3">
        <AuthInput
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          icon={<Mail />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div>
          <AuthInput
            id="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            icon={<Lock />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-bg-primary accent-brand cursor-pointer"
              />
              <span className="text-[13px] text-text-secondary">Remember email</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-[13px] text-brand hover:text-brand-hover transition-colors shrink-0"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {info && <AuthAlert show={!!info} variant="info">{info}</AuthAlert>}

        {error && <AuthAlert show={!!error} variant="error">{error}</AuthAlert>}

        <AuthSubmitButton
          type="submit"
          disabled={loading || !email.trim() || !password}
          loading={loading}
          className="auth-submit-btn mt-0.5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--fin-btn-bg)] px-4 py-3 text-[15px] font-semibold text-[var(--fin-btn-fg)] disabled:cursor-not-allowed disabled:opacity-50 sm:py-3.5"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </AuthSubmitButton>
      </form>

      <p className="mt-3 text-center text-[10px] leading-snug text-text-tertiary sm:mt-4 sm:text-[11px]">
        Protected by encryption. By signing in you agree to our{" "}
        <Link href="/terms" className="text-brand hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-brand hover:underline">
          Privacy Policy
        </Link>
        . Need to finish signup?{" "}
        <Link
          href={email.trim() ? `/verify-email?email=${encodeURIComponent(email.trim())}` : "/verify-email"}
          className="text-brand hover:underline"
        >
          Verify email
        </Link>
        .
      </p>
    </AuthShell>
  );
}
