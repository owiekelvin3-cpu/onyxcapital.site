"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { requestAuthEmail } from "@/lib/auth/request-auth-email";
import { AuthShell, AuthCardHeader } from "@/components/auth/AuthLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { Button } from "@/components/ui/Button";
import { Loader2, Mail } from "@/components/icons";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const expired = new URLSearchParams(window.location.search).get("error") === "link";
    if (expired) setError("That reset link has expired. Request a new one.");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await requestAuthEmail("/api/auth/recovery", { email: email.trim() });
      setLoading(false);
      if (!result.ok) {
        setError(result.error || "Could not send a reset email right now. Try again shortly.");
        return;
      }
      setSent(true);
    } catch {
      setLoading(false);
      setError("Network error. Check your connection and try again.");
    }
  }

  return (
    <AuthShell
      panelTitle="Reset your password"
      panelSubtitle="We'll email you a link to choose a new password. Check your inbox and your spam folder."
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

        {sent && (
          <p className="text-[13px] text-green bg-green/[0.08] border border-green/30 rounded-lg px-4 py-3">
            If an account exists for that email, we sent a reset link. Open it to choose a new password. Check spam if it is not in your inbox.
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
