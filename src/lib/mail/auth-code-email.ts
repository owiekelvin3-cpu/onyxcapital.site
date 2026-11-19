import { BRAND } from "@/lib/constants";
import { escapeHtml } from "@/lib/mail/branded-email";

const BLACK = "#111111";
const LIME = "#e2ff4c";
const MUTED = "#a3a3a3";
const BODY = "#e5e5e5";
const CARD = "#161616";
const BORDER = "#2a2a2a";

export type AuthCodeKind = "signup" | "recovery";

export function authCodeSubject(kind: AuthCodeKind) {
  return kind === "signup"
    ? "Verify your Onyx Capital email"
    : "Reset your Onyx Capital password";
}

export function renderAuthCodeEmail(params: {
  kind: AuthCodeKind;
  code: string;
  actionLink?: string | null;
}) {
  const code = params.code.replace(/\D/g, "");
  const subject = authCodeSubject(params.kind);
  const intro =
    params.kind === "signup"
      ? "Use this code to finish creating your Onyx Capital account."
      : "Use this code to choose a new Onyx Capital password.";
  const buttonLabel = params.kind === "signup" ? "Confirm email" : "Reset password";
  const actionLink =
    params.actionLink && params.actionLink.startsWith("https://") ? params.actionLink : "";
  const site = `https://${BRAND.domain}`;
  const page =
    params.kind === "signup" ? `${site}/verify-email` : `${site}/reset-password`;

  const button = actionLink
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
        <tr>
          <td style="border-radius:999px;background:${LIME};">
            <a href="${escapeHtml(actionLink)}" style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:${BLACK};text-decoration:none;">${buttonLabel}</a>
          </td>
        </tr>
      </table>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:${BLACK};">
    <div style="display:none;max-height:0;overflow:hidden;color:${BLACK};">${escapeHtml(intro)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BLACK};padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${CARD};border:1px solid ${BORDER};border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:22px 28px;background:${BLACK};border-bottom:3px solid ${LIME};">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${LIME};">Onyx Capital</p>
                <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#ffffff;">${escapeHtml(subject)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${BODY};">${escapeHtml(intro)}</p>
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:32px;letter-spacing:8px;font-weight:700;color:#ffffff;">${escapeHtml(code)}</p>
                <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${MUTED};">This code expires in 1 hour. You can also enter it at <a href="${page}" style="color:${LIME};text-decoration:none;">${page.replace("https://", "")}</a>.</p>
                ${button}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:${BLACK};border-top:1px solid ${BORDER};">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};">
                  If you did not ask for this email, you can ignore it.<br />
                  ${escapeHtml(BRAND.fullName)} · <a href="${site}" style="color:${LIME};text-decoration:none;">${BRAND.domain}</a><br />
                  ${escapeHtml(BRAND.supportEmail)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    subject,
    "",
    intro,
    "",
    `Code: ${code}`,
    "",
    "This code expires in 1 hour.",
    `Enter it at ${page}`,
    actionLink ? `${buttonLabel}: ${actionLink}` : "",
    "",
    "If you did not ask for this email, you can ignore it.",
    `${BRAND.fullName} · ${site}`,
    BRAND.supportEmail,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return { subject, html, text };
}
