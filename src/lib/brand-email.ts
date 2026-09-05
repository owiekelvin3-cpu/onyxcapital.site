import { BRAND } from "@/lib/constants";

export const SUPPORT_EMAIL = BRAND.supportEmail;

export const MAIL_TEMPLATE_IDS = [
  "general",
  "account",
  "deposit",
  "withdrawal",
  "kyc",
  "custom",
] as const;

export type MailTemplateId = (typeof MAIL_TEMPLATE_IDS)[number];

export type MailTemplate = {
  id: MailTemplateId;
  label: string;
  heading: string;
  subject: string;
  placeholder: string;
};

export const MAIL_TEMPLATES: MailTemplate[] = [
  {
    id: "general",
    label: "General message",
    heading: "A message from Onyx Capital",
    subject: "A message from Onyx Capital",
    placeholder: "Write the update you want this user to receive…",
  },
  {
    id: "account",
    label: "Account update",
    heading: "Account update",
    subject: "Update on your Onyx Capital account",
    placeholder: "Explain the account change, what they should do next, and any deadline…",
  },
  {
    id: "deposit",
    label: "Deposit",
    heading: "Deposit update",
    subject: "Update on your Onyx Capital deposit",
    placeholder: "Share the deposit status, amount, and any next step…",
  },
  {
    id: "withdrawal",
    label: "Withdrawal",
    heading: "Withdrawal update",
    subject: "Update on your Onyx Capital withdrawal",
    placeholder: "Share the withdrawal status, payout method, and timing…",
  },
  {
    id: "kyc",
    label: "Identity verification",
    heading: "Identity verification update",
    subject: "Update on your identity verification",
    placeholder: "Tell them if KYC was approved, needs a new photo, or is still in review…",
  },
  {
    id: "custom",
    label: "Custom",
    heading: "Message from Onyx Capital",
    subject: "",
    placeholder: "Write a custom message…",
  },
];

export function isMailTemplateId(value: string): value is MailTemplateId {
  return (MAIL_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function getMailTemplate(id: string): MailTemplate {
  return MAIL_TEMPLATES.find((item) => item.id === id) ?? MAIL_TEMPLATES[0];
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return `https://${BRAND.domain}`;
}

export function renderBrandEmailHtml({
  recipientName,
  heading,
  body,
  subject,
}: {
  recipientName: string;
  heading: string;
  body: string;
  subject: string;
}): string {
  const greetingName = recipientName.trim() || "there";
  const paragraphs = body
    .trim()
    .split(/\n{2,}/)
    .map((block) => escapeHtml(block).replace(/\n/g, "<br />"))
    .filter(Boolean)
    .map(
      (html) =>
        `<p style="margin:0 0 16px;color:#d4d4d4;font-size:15px;line-height:1.6;">${html}</p>`
    )
    .join("");

  const dashboardHref = `${siteUrl()}/dashboard`;
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#111111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;border-collapse:separate;">
          <tr>
            <td style="padding:24px 28px;background:#0a0a0a;border:1px solid #2a2a2a;border-bottom:none;border-radius:16px 16px 0 0;">
              <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#e2ff4c;font-weight:700;">${escapeHtml(BRAND.name)}</p>
              <p style="margin:10px 0 0;font-size:22px;line-height:1.3;color:#ffffff;font-weight:700;">${escapeHtml(heading)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;background:#161616;border-left:1px solid #2a2a2a;border-right:1px solid #2a2a2a;">
              <p style="margin:0 0 16px;color:#a3a3a3;font-size:14px;">Hello ${escapeHtml(greetingName)},</p>
              ${paragraphs || `<p style="margin:0 0 16px;color:#d4d4d4;font-size:15px;line-height:1.6;">Please sign in to your dashboard for the latest update.</p>`}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
                <tr>
                  <td style="border-radius:12px;background:#e2ff4c;">
                    <a href="${escapeHtml(dashboardHref)}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:700;color:#111111;text-decoration:none;">Open your dashboard</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#737373;font-size:13px;line-height:1.5;">If you did not expect this email, reply to ${escapeHtml(SUPPORT_EMAIL)} and our team will help.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;background:#0a0a0a;border:1px solid #2a2a2a;border-top:none;border-radius:0 0 16px 16px;">
              <p style="margin:0;color:#a3a3a3;font-size:12px;">Contact us at <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:#e2ff4c;text-decoration:none;">${escapeHtml(SUPPORT_EMAIL)}</a></p>
              <p style="margin:8px 0 0;color:#525252;font-size:11px;">&copy; ${year} ${escapeHtml(BRAND.name)} · ${escapeHtml(BRAND.domain)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderBrandEmailText({
  recipientName,
  heading,
  body,
}: {
  recipientName: string;
  heading: string;
  body: string;
}): string {
  const greetingName = recipientName.trim() || "there";
  return [
    `${BRAND.name}`,
    heading,
    "",
    `Hello ${greetingName},`,
    "",
    body.trim(),
    "",
    `Open your dashboard: ${siteUrl()}/dashboard`,
    "",
    `Questions? Email ${SUPPORT_EMAIL}`,
    `© ${new Date().getFullYear()} ${BRAND.name} · ${BRAND.domain}`,
  ].join("\n");
}
