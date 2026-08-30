"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth/friendly-error";
import { AuthShell, AuthCardHeader } from "@/components/auth/AuthLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { Button } from "@/components/ui/Button";
import { Loader2, Lock } from "@/components/icons";

export default function ResetPasswordPage() {
  const router = useRouter();
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
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || nextSession) {
          setReady(true);
          setChecking(false);
        }
      });

      // Give the recovery session a moment to hydrate from cookies
      window.setTimeout(async () => {
        if (cancelled) return;
        const {
          data: { session: lateSession },
        } = await supabase.auth.getSession();
        if (lateSession) {
          setReady(true);
        }
        setChecking(false);
      }, 1200);

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
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(friendlyAuthError(updateError.message, "Could not update your password. Try again."));
      setLoading(false);
      return;
    }

    setSuccess("Password updated. Redirecting…");
    setTimeout(() => {
      router.push("/login?reset=1");
      router.refresh();
    }, 800);
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

  if (!ready) {
    return (
      <AuthShell panelTitle="Reset password" panelSubtitle="Choose a new password for your account.">
        <div className="rounded-lg border border-border bg-bg-secondary/40 px-4 py-6 text-center text-sm text-text-secondary">
          <p>This reset link is invalid or has expired.</p>
          <p className="mt-2 text-xs text-text-tertiary">
            Request a new link and open it in the same browser.
          </p>
          <Link href="/forgot-password" className="mt-3 inline-block text-brand hover:text-brand-hover">
            Request a new link
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell panelTitle="Reset password" panelSubtitle="Choose a new password for your account.">
      <AuthCardHeader
        title="New password"
        subtitle="Use at least 8 characters"
        alternate={{
          prompt: "Back to",
          href: "/login",
          label: "Sign in",
        }}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
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
              Updating...
            </span>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
