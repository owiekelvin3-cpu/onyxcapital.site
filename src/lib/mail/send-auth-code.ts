import { BRAND } from "@/lib/constants";
import { resendFromAddress } from "@/lib/mail/resend";
import { authCodeSubject, renderAuthCodeEmail, type AuthCodeKind } from "@/lib/mail/auth-code-email";

export async function sendAuthCodeEmail(params: {
  to: string;
  kind: AuthCodeKind;
  code: string;
  actionLink?: string | null;
}) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("Email is not configured on the server.");

  const rendered = renderAuthCodeEmail(params);
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    resendFromAddress() ||
    `${BRAND.name} <noreply@${BRAND.domain}>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: rendered.subject || authCodeSubject(params.kind),
      html: rendered.html,
      text: rendered.text,
      reply_to: BRAND.supportEmail,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    message?: string;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(json.error?.message || json.message || "The email service rejected the message.");
  }
}
