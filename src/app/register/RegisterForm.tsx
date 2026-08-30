"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validateReferralCode } from "@/lib/api/referrals";
import { isDuplicateSignupUser, signupErrorMessage } from "@/lib/auth/email-otp";
import { getAppUrl } from "@/lib/env";
import { BRAND, MIN_ACCOUNT_AGE } from "@/lib/constants";
import { COUNTRIES } from "@/lib/countries";
import { AuthShell, AuthCardHeader } from "@/components/auth/AuthLayout";
import { AuthInput, AuthSelect } from "@/components/auth/AuthInput";
import {
  AuthSteps,
  PasswordStrength,
} from "@/components/auth/AuthSteps";
import { AuthSlidePanel, AuthAlert, AuthSubmitButton } from "@/components/auth/auth-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  User,
  Share,
} from "@/components/icons";

const REGISTER_STEPS = [
  { label: "Account" },
  { label: "Profile" },
  { label: "Security" },
];

/** Latest date allowed — user must be at least MIN_ACCOUNT_AGE */
function maxBirthDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_ACCOUNT_AGE);
  return d.toISOString().slice(0, 10);
}

function minBirthDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 100);
  return d.toISOString().slice(0, 10);
}

function parseDateOfBirth(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return value;
}

function isAtLeastMinAge(isoDate: string, minAge = MIN_ACCOUNT_AGE): boolean {
  const dob = new Date(isoDate);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= minAge;
}

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("United States");
  const [address, setAddress] = useState("");
  const [referralCode, setReferralCode] = useState((searchParams.get("ref") ?? "").toUpperCase());
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function validateStep(current: number) {
    const errors: Record<string, string> = {};

    if (current === 1) {
      if (!firstName.trim()) errors.firstName = "Required";
      if (!lastName.trim()) errors.lastName = "Required";
      if (!email.trim()) errors.email = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        errors.email = "Enter a valid email";

      const parsedDob = parseDateOfBirth(dateOfBirth);
      if (!dateOfBirth) errors.dateOfBirth = "Select your date of birth";
      else if (!parsedDob) errors.dateOfBirth = "Enter a valid date";
      else if (!isAtLeastMinAge(parsedDob))
        errors.dateOfBirth = `You must be at least ${MIN_ACCOUNT_AGE} years old`;
    }

    if (current === 2 && referralCode.trim()) {
      try {
        const supabase = createClient();
        const valid = await validateReferralCode(supabase, referralCode.trim());
        if (!valid) errors.referralCode = "Referral ID not found";
      } catch {
        errors.referralCode = "Could not validate referral ID";
      }
    }

    if (current === 3) {
      if (password.length < 8) errors.password = "Min. 8 characters";
      if (password !== confirmPassword) errors.confirmPassword = "Passwords must match";
      if (referralCode.trim()) {
        try {
          const supabase = createClient();
          const valid = await validateReferralCode(supabase, referralCode.trim());
          if (!valid) errors.referralCode = "Referral ID not found";
        } catch {
          errors.referralCode = "Could not validate referral ID";
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleNext() {
    if (!(await validateStep(step))) return;
    setStep((s) => Math.min(s + 1, 3));
  }

  function handleBack() {
    setFieldErrors({});
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!(await validateStep(3))) return;

    const parsedDob = parseDateOfBirth(dateOfBirth);
    if (!parsedDob) return;

    setError("");
    setLoading(true);

    const trimmedEmail = email.trim();
    const supabase = createClient();
    const appUrl = getAppUrl();

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard`,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            date_of_birth: parsedDob,
            phone: phone.trim() || null,
            country: country.trim() || null,
            address: address.trim() || null,
            referral_code: referralCode.trim().toUpperCase() || null,
          },
        },
      });

      if (authError) {
        setError(signupErrorMessage(authError.message));
        setLoading(false);
        return;
      }

      if (isDuplicateSignupUser(data.user)) {
        setError("An account with this email already exists. Sign in instead.");
        setLoading(false);
        return;
      }

      router.push(`/verify-email?email=${encodeURIComponent(trimmedEmail)}&sent=1`);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      wide
      panelTitle="Create your Onyx Capital account"
      panelSubtitle="Open your account in minutes. Trade crypto, stocks, and forex with deep liquidity and low fees."
    >
      <AuthCardHeader
        title="Create account"
        subtitle={`Start trading on ${BRAND.fullName}`}
        alternate={{
          prompt: "Already have an account?",
          href: "/login",
          label: "Sign in",
        }}
      />

      <AuthSteps steps={REGISTER_STEPS} current={step} />

      <form onSubmit={handleSubmit} className="space-y-3">
        <AuthSlidePanel panelKey={step}>
        {step === 1 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AuthInput
                id="firstName"
                label="First name"
                type="text"
                placeholder="John"
                autoComplete="given-name"
                icon={<User />}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                error={fieldErrors.firstName}
                required
              />
              <AuthInput
                id="lastName"
                label="Last name"
                type="text"
                placeholder="Doe"
                autoComplete="family-name"
                icon={<User />}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                error={fieldErrors.lastName}
                required
              />
            </div>
            <AuthInput
              id="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              icon={<Mail />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              required
            />
            <AuthInput
              id="dateOfBirth"
              label="Date of birth"
              type="date"
              autoComplete="bday"
              icon={<Calendar />}
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              min={minBirthDate()}
              max={maxBirthDate()}
              error={fieldErrors.dateOfBirth}
              required
            />
            <p className="-mt-1 text-[11px] text-text-tertiary">
              You must be {MIN_ACCOUNT_AGE} or older.
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <p className="-mt-1 mb-1 text-[12px] text-text-secondary">
              Optional profile details.
            </p>
            <AuthInput
              id="phone"
              label="Phone"
              type="tel"
              placeholder="+1 234 567 8900"
              autoComplete="tel"
              icon={<Phone />}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <AuthSelect
              id="country"
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </AuthSelect>
            <AuthInput
              id="address"
              label="Address"
              type="text"
              placeholder="123 Main Street"
              autoComplete="street-address"
              icon={<MapPin />}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <AuthInput
              id="referralCode"
              label="Referral ID (optional)"
              type="text"
              placeholder="Enter a friend's referral code"
              autoComplete="off"
              icon={<Share />}
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              error={fieldErrors.referralCode}
            />
            <p className="-mt-1 text-[11px] text-text-tertiary">
              Have a referral code? Enter it here. Your referrer earns $100 when you make your first deposit.
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <AuthInput
              id="password"
              label="Password"
              type="password"
              placeholder="Create a strong password"
              autoComplete="new-password"
              icon={<Lock />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              required
            />
            <PasswordStrength password={password} />
            <AuthInput
              id="confirmPassword"
              label="Confirm password"
              type="password"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              icon={<Lock />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={fieldErrors.confirmPassword}
              required
            />
            <p className="text-[11px] leading-snug text-text-tertiary">
              By creating an account, I agree to the{" "}
              <Link href="/terms" className="text-brand hover:underline">
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-brand hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </>
        )}

        {error && <AuthAlert show={!!error} variant="error">{error}</AuthAlert>}
        </AuthSlidePanel>

        <div className="flex gap-2 pt-1 sm:gap-3 sm:pt-2">
          {step > 1 && (
            <AuthSubmitButton
              type="button"
              onClick={handleBack}
              className="auth-submit-btn flex flex-1 items-center justify-center gap-1 rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm font-semibold text-text-primary sm:px-4 sm:py-3.5 sm:text-[15px]"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </AuthSubmitButton>
          )}

          {step < 3 ? (
            <AuthSubmitButton
              type="button"
              onClick={handleNext}
              className="auth-submit-btn flex flex-1 items-center justify-center gap-1 rounded-xl bg-[var(--fin-btn-bg)] px-3 py-2.5 text-sm font-semibold text-[var(--fin-btn-fg)] sm:px-4 sm:py-3.5 sm:text-[15px]"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </AuthSubmitButton>
          ) : (
            <AuthSubmitButton
              type="submit"
              disabled={loading}
              loading={loading}
              className="auth-submit-btn flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--fin-btn-bg)] px-3 py-2.5 text-sm font-semibold text-[var(--fin-btn-fg)] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-3.5 sm:text-[15px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </AuthSubmitButton>
          )}
        </div>
      </form>
    </AuthShell>
  );
}
