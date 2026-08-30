"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth/friendly-error";
import { BRAND } from "@/lib/constants";
import { clearAdminSession, establishAdminSession } from "@/lib/auth-guards";
import { AuthShell, AuthCardHeader } from "@/components/auth/AuthLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthAlert, AuthSubmitButton } from "@/components/auth/auth-motion";
import { Loader2, Lock, Mail } from "@/components/icons";

export default function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const trimmedEmail = email.trim();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (authError) {
      setError(friendlyAuthError(authError.message, "Could not sign in. Check your email and password."));
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    const session = authData.session;
    if (!userId || !session?.access_token || !session.refresh_token) {
      setError("Sign in failed. Please try again.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      await supabase.auth.signOut();
      await clearAdminSession();
      setError("Could not verify team access. Please try again.");
      setLoading(false);
      return;
    }

    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      await clearAdminSession();
      setError("This account does not have team access.");
      setLoading(false);
      return;
    }

    const teamSession = await establishAdminSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (!teamSession.ok) {
      await supabase.auth.signOut();
      await clearAdminSession();
      setError(teamSession.error ?? "Could not start team session. Please try again.");
      setLoading(false);
      return;
    }

    window.location.assign("/admin");
  }

  return (
    <AuthShell
      panelTitle="Team Console"
      panelSubtitle="Secure access for authorized operators — manage users, deposits, compliance, and platform settings."
    >
      <AuthCardHeader
        title="Team sign in"
        subtitle={`Access the ${BRAND.fullName} operator console`}
        alternate={{
          prompt: "Trading account?",
          href: "/login",
          label: "User login",
        }}
      />

      <p className="mb-4 text-[13px] leading-relaxed text-text-secondary">
        Sign in with your operator email and password. Only accounts with team access can enter this area.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
        <AuthInput
          id="team-email"
          label="Team email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          icon={<Mail />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <AuthInput
          id="team-password"
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          icon={<Lock />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <AuthAlert show={!!error} variant="error">
          {error}
        </AuthAlert>

        <AuthSubmitButton
          type="submit"
          disabled={loading || !email.trim() || !password}
          loading={loading}
          className="auth-submit-btn relative mt-1 w-full overflow-hidden rounded-xl bg-[var(--fin-btn-bg)] px-4 py-3.5 text-[15px] font-semibold text-[var(--fin-btn-fg)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Signing in...
            </span>
          ) : (
            "Sign in to console"
          )}
        </AuthSubmitButton>
      </form>

      <p className="mt-5 text-center text-[12px] text-text-tertiary">
        <Link href="/" className="text-brand hover:underline">
          Back to {BRAND.name}
        </Link>
      </p>
    </AuthShell>
  );
}
