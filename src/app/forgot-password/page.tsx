"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth/friendly-error";
import { getAppUrl } from "@/lib/env";
import { AuthShell, AuthCardHeader } from "@/components/auth/AuthLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { Button } from "@/components/ui/Button";
import { Loader2, Mail } from "@/components/icons";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${getAppUrl()}/auth/callback?next=/reset-password` }
    );

    if (resetError) {
      setError(
        friendlyAuthError(resetError.message, "Could not send a reset email right now. Try again shortly.")
      );
    } else {
      setSuccess("If an account exists for that email, we sent a reset link.");
    }
    setLoading(false);
  }

  return (
    <AuthShell
      panelTitle="Reset your password"
      panelSubtitle="We'll email you a secure link to choose a new password."
    >
      <AuthCardHeader
        title="Forgot password"
        subtitle="Enter the email on your Onyx Capital account"
        alternate={{
          prompt: "Remember your password?",
          href: "/login",
          label: "Back to sign in",
        }}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
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

        {success && (
          <p className="text-[13px] text-green bg-green/[0.08] border border-green/30 rounded-lg px-4 py-3">
            {success}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="text-[13px] text-red bg-red/[0.08] border border-red/30 rounded-lg px-4 py-3"
          >
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </span>
          ) : (
            "Send reset link"
          )}
        </Button>

        <p className="text-center text-[13px] text-text-tertiary">
          Need help?{" "}
          <Link href="/help" className="text-brand hover:text-brand-hover">
            Contact support
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
