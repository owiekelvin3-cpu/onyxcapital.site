"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestAuthEmail } from "@/lib/auth/request-auth-email";
import { AuthShell, AuthCardHeader } from "@/components/auth/AuthLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { Button } from "@/components/ui/Button";
import { Loader2, Mail } from "@/components/icons";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`);
    } catch {
      setLoading(false);
      setError("Network error. Check your connection and try again.");
    }
  }

  return (
    <AuthShell
      panelTitle="Reset your password"
      panelSubtitle="We'll email you a 6-digit code. Check your inbox and your spam folder."
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
            "Send reset code"
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
