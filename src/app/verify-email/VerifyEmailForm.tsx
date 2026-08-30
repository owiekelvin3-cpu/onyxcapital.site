"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/constants";
import {
  EMAIL_OTP_LENGTH,
  EMAIL_OTP_RESEND_SECONDS,
  resendOtpErrorMessage,
  verifyOtpErrorMessage,
} from "@/lib/auth/email-otp";
import { AuthShell, AuthCardHeader } from "@/components/auth/AuthLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { EmailOtpInput } from "@/components/auth/EmailOtpInput";
import { AuthAlert, AuthSubmitButton } from "@/components/auth/auth-motion";
import { Loader2, Mail } from "@/components/icons";

export default function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(
    searchParams.get("email")
      ? "Enter the 6-digit code we sent to your email."
      : "Enter your email, then the 6-digit code we sent."
  );
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(searchParams.get("sent") === "1" ? EMAIL_OTP_RESEND_SECONDS : 0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const token = code.replace(/\D/g, "");

    if (!trimmedEmail) {
      setError("Enter the email you used to create your account.");
      return;
    }
    if (token.length !== EMAIL_OTP_LENGTH) {
      setError("Enter the 6-digit code we sent to your email.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token,
        type: "signup",
      });

      if (verifyError) {
        const { error: emailOtpError } = await supabase.auth.verifyOtp({
          email: trimmedEmail,
          token,
          type: "email",
        });
        if (emailOtpError) {
          setError(verifyOtpErrorMessage(verifyError.message || emailOtpError.message));
          setLoading(false);
          return;
        }
      }

      setCode("");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
      setLoading(false);
    }
  }

  async function handleResend() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || cooldown > 0 || resending) return;

    setError("");
    setResending(true);

    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: trimmedEmail,
      });

      if (resendError) {
        setError(resendOtpErrorMessage(resendError.message));
        setResending(false);
        return;
      }

      setInfo("Enter the 6-digit code we sent to your email.");
      setCooldown(EMAIL_OTP_RESEND_SECONDS);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell
      panelTitle="Verify your email"
      panelSubtitle="Enter the one-time code we emailed so only you can finish opening the account."
    >
      <AuthCardHeader
        title="Check your email"
        subtitle={`Enter the 6-digit code we sent to your email${email.trim() ? ` (${email.trim()})` : ""}.`}
        alternate={{
          prompt: "Used the wrong email?",
          href: "/register",
          label: "Create account again",
        }}
      />

      <form onSubmit={handleVerify} className="space-y-3">
        <AuthInput
          id="email"
          label="Email"
          type="email"
          placeholder="you@gmail.com"
          autoComplete="email"
          icon={<Mail />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <EmailOtpInput
          value={code}
          onChange={setCode}
          disabled={loading}
          error={Boolean(error)}
        />

        {info && (
          <AuthAlert show={!!info} variant="info">
            {info}
          </AuthAlert>
        )}
        {error && (
          <AuthAlert show={!!error} variant="error">
            {error}
          </AuthAlert>
        )}

        <AuthSubmitButton
          type="submit"
          disabled={loading || email.trim().length === 0 || code.replace(/\D/g, "").length !== EMAIL_OTP_LENGTH}
          loading={loading}
          className="auth-submit-btn mt-0.5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--fin-btn-bg)] px-4 py-3 text-[15px] font-semibold text-[var(--fin-btn-fg)] disabled:cursor-not-allowed disabled:opacity-50 sm:py-3.5"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify"
          )}
        </AuthSubmitButton>
      </form>

      <div className="mt-4 flex flex-col items-center gap-2 text-center text-[13px] text-text-tertiary">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={resending || cooldown > 0 || !email.trim()}
          className="min-h-11 px-3 text-brand hover:underline disabled:cursor-not-allowed disabled:text-text-tertiary disabled:no-underline"
        >
          {resending
            ? "Sending a new code..."
            : cooldown > 0
              ? `Resend code in ${cooldown}s`
              : "Resend code"}
        </button>
        <Link href="/login" className="min-h-11 px-3 leading-[2.75rem] hover:text-text-primary">
          Back to sign in
        </Link>
        <p className="max-w-xs text-[11px] leading-relaxed">
          {BRAND.name} never asks you to share this code with anyone.
        </p>
      </div>
    </AuthShell>
  );
}
