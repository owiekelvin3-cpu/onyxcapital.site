"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth/friendly-error";
import { EMAIL_OTP_LENGTH, verifyOtpErrorMessage } from "@/lib/auth/email-otp";
import { requestAuthEmail } from "@/lib/auth/request-auth-email";
import { AuthShell, AuthCardHeader } from "@/components/auth/AuthLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { EmailOtpInput } from "@/components/auth/EmailOtpInput";
import { Button } from "@/components/ui/Button";
import { Loader2, Lock, Mail } from "@/components/icons";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function resolveSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!cancelled && session) {
        setReady(true);
        setChecking(false);
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (cancelled) return;
        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && nextSession)) {
          setReady(true);
          setChecking(false);
        }
      });

      window.setTimeout(async () => {
        if (cancelled) return;
        const {
          data: { session: lateSession },
        } = await supabase.auth.getSession();
        if (lateSession) setReady(true);
        setChecking(false);
      }, 800);

      return () => subscription.unsubscribe();
    }

    const cleanupPromise = resolveSession();
    return () => {
      cancelled = true;
      void cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords must match");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    if (!ready) {
      const trimmedEmail = email.trim();
      const token = code.replace(/\D/g, "");
      if (!trimmedEmail) {
        setError("Enter the email on your account.");
        setLoading(false);
        return;
      }
      if (token.length !== EMAIL_OTP_LENGTH) {
        setError("Enter the 6-digit code from the reset email.");
        setLoading(false);
        return;
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token,
        type: "recovery",
      });
      if (verifyError) {
        setError(verifyOtpErrorMessage(verifyError.message));
        setLoading(false);
        return;
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(friendlyAuthError(updateError.message, "Could not update your password. Try again."));
      setLoading(false);
      return;
    }

    setSuccess("Password updated. Redirecting…");
    await supabase.auth.signOut({ scope: "local" });
    router.push("/login?reset=1");
    router.refresh();
  }

  async function handleResend() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter your email first.");
      return;
    }
    setError("");
    setLoading(true);
    const result = await requestAuthEmail("/api/auth/recovery", { email: trimmedEmail });
    setLoading(false);
    if (!result.ok) {
      setError(result.error || "Could not send a new code. Try again shortly.");
      return;
    }
    setSuccess("If an account exists for that email, we sent a new reset link. Open it from your inbox. Check spam if you do not see it.");
  }

  if (checking) {
    return (
      <AuthShell panelTitle="Reset password" panelSubtitle="Verifying your reset link…">
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking reset link…
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell panelTitle="Reset password" panelSubtitle="Choose a new password for your account.">
      <AuthCardHeader
        title="New password"
        subtitle={ready ? "Use at least 8 characters" : "Enter the 6-digit code from your email. Check spam if you do not see it."}
        alternate={{
          prompt: "Remember your password?",
          href: "/login",
          label: "Back to sign in",
        }}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        {!ready && (
          <>
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
              <p className="mb-2 text-xs font-medium text-text-secondary">Reset code</p>
              <EmailOtpInput value={code} onChange={setCode} disabled={loading} error={Boolean(error)} />
            </div>
          </>
        )}
        <AuthInput
          id="password"
          label="New password"
          type="password"
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          icon={<Lock />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <AuthInput
          id="confirmPassword"
          label="Confirm password"
          type="password"
          placeholder="Repeat password"
          autoComplete="new-password"
          icon={<Lock />}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        {success && (
          <p className="text-[13px] text-green bg-green/[0.08] border border-green/30 rounded-lg px-4 py-3">
            {success}
          </p>
        )}
        {error && (
          <p role="alert" className="text-[13px] text-red bg-red/[0.08] border border-red/30 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Updating...
            </span>
          ) : (
            "Update password"
          )}
        </Button>
      </form>

      {!ready && (
        <p className="mt-4 text-center text-[13px] text-text-tertiary">
          Didn&apos;t get a code?{" "}
          <button type="button" onClick={() => void handleResend()} className="text-brand hover:text-brand-hover" disabled={loading}>
            Send it again
          </button>
          {" · "}
          <Link href="/forgot-password" className="text-brand hover:text-brand-hover">
            Start over
          </Link>
        </p>
      )}
    </AuthShell>
  );
}
