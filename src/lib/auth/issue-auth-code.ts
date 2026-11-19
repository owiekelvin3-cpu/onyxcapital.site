import type { User } from "@supabase/supabase-js";
import { validateReferralCode } from "@/lib/api/referrals";
import { MIN_ACCOUNT_AGE } from "@/lib/constants";
import { signupErrorMessage } from "@/lib/auth/email-otp";
import { getAppUrl } from "@/lib/env";
import { sendAuthCodeEmail } from "@/lib/mail/send-auth-code";
import { createServiceClient } from "@/lib/supabase/service";

type IssueResult =
  | { ok: true }
  | { ok: false; error: string; status: number; created?: boolean };

export type SignupEmailInput = {
  email?: unknown;
  password?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  dateOfBirth?: unknown;
  phone?: unknown;
  country?: unknown;
  address?: unknown;
  referralCode?: unknown;
};

function clean(value: unknown, max = 160) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function redirectTo(next: string) {
  return `${getAppUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
}

function isMissingUser(message: string) {
  return /not found|no user|user not/.test(message.toLowerCase());
}

function isDuplicate(message: string) {
  return /already|registered|exists|duplicate/.test(message.toLowerCase());
}

function parseDob(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) age -= 1;
  if (age < MIN_ACCOUNT_AGE || age > 100) return null;
  return value;
}

async function findUserByEmail(email: string): Promise<User | null> {
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (!profile?.id) return null;
  const { data, error } = await supabase.auth.admin.getUserById(profile.id);
  if (error || !data.user) return null;
  return data.user;
}

async function deliver(params: {
  email: string;
  kind: "signup" | "recovery";
  code: string;
  actionLink?: string | null;
  created?: boolean;
}): Promise<IssueResult> {
  try {
    await sendAuthCodeEmail({
      to: params.email,
      kind: params.kind,
      code: params.code,
      actionLink: params.actionLink,
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send the email.";
    return {
      ok: false,
      status: 502,
      created: params.created,
      error: params.created
        ? "Your account was created, but the email could not be sent. Use Resend code on the next page."
        : signupErrorMessage(message),
    };
  }
}

async function sendExistingSignupCode(email: string, password?: string): Promise<IssueResult> {
  const user = await findUserByEmail(email);
  if (!user || user.email_confirmed_at) {
    return {
      ok: false,
      status: 409,
      error: "An account with this email already exists. Sign in instead.",
    };
  }

  if (password && password.length >= 8) {
    const supabase = createServiceClient();
    await supabase.auth.admin.updateUserById(user.id, { password });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: redirectTo("/dashboard") },
  });

  if (error || !data.properties?.email_otp) {
    return {
      ok: false,
      status: 400,
      error: signupErrorMessage(error?.message),
    };
  }

  return deliver({
    email,
    kind: "signup",
    code: data.properties.email_otp,
    actionLink: data.properties.action_link,
  });
}

export async function issueSignupCode(input: SignupEmailInput): Promise<IssueResult> {
  const email = clean(input.email, 320).toLowerCase();
  const password = typeof input.password === "string" ? input.password : "";
  const firstName = clean(input.firstName, 80);
  const lastName = clean(input.lastName, 80);
  const dateOfBirth = parseDob(clean(input.dateOfBirth, 10));
  const phone = clean(input.phone, 40);
  const country = clean(input.country, 80);
  const address = clean(input.address, 200);
  const referralCode = clean(input.referralCode, 32).toUpperCase();

  if (!isEmail(email)) return { ok: false, status: 400, error: "Enter a valid email." };
  if (password.length < 8) return { ok: false, status: 400, error: "Password must be at least 8 characters." };
  if (password.length > 72) return { ok: false, status: 400, error: "Password is too long." };
  if (!firstName || !lastName) return { ok: false, status: 400, error: "Enter your first and last name." };
  if (!dateOfBirth) {
    return { ok: false, status: 400, error: `You must be at least ${MIN_ACCOUNT_AGE} years old.` };
  }

  const supabase = createServiceClient();
  if (referralCode) {
    try {
      const valid = await validateReferralCode(supabase, referralCode);
      if (!valid) return { ok: false, status: 400, error: "Referral ID not found." };
    } catch {
      return { ok: false, status: 400, error: "Could not validate referral ID." };
    }
  }

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      redirectTo: redirectTo("/dashboard"),
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        date_of_birth: dateOfBirth,
        phone: phone || null,
        country: country || null,
        address: address || null,
        referral_code: referralCode || null,
      },
    },
  });

  if (error) {
    if (isDuplicate(error.message)) return sendExistingSignupCode(email, password);
    return { ok: false, status: 400, error: signupErrorMessage(error.message) };
  }

  if (!data.properties?.email_otp) {
    return { ok: false, status: 500, created: true, error: "Could not create a verification code." };
  }

  return deliver({
    email,
    kind: "signup",
    code: data.properties.email_otp,
    actionLink: data.properties.action_link,
    created: true,
  });
}

export async function issueSignupResend(emailInput: unknown): Promise<IssueResult> {
  const email = clean(emailInput, 320).toLowerCase();
  if (!isEmail(email)) return { ok: false, status: 400, error: "Enter a valid email." };
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, status: 404, error: "Create an account with this email first." };
  if (user.email_confirmed_at) {
    return { ok: false, status: 409, error: "This email is already verified. Sign in instead." };
  }
  return sendExistingSignupCode(email);
}

export async function issueRecoveryCode(emailInput: unknown): Promise<IssueResult> {
  const email = clean(emailInput, 320).toLowerCase();
  if (!isEmail(email)) return { ok: false, status: 400, error: "Enter a valid email." };

  const supabase = createServiceClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: redirectTo("/reset-password") },
  });

  if (error) {
    if (isMissingUser(error.message)) return { ok: true };
    return { ok: false, status: 400, error: signupErrorMessage(error.message) };
  }

  if (!data.properties?.email_otp) return { ok: true };

  return deliver({
    email,
    kind: "recovery",
    code: data.properties.email_otp,
    actionLink: data.properties.action_link,
  });
}
