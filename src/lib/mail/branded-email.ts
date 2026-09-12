import { BRAND } from "@/lib/constants";

const BLACK = "#111111";
const LIME = "#e2ff4c";
const MUTED = "#a3a3a3";
const BODY = "#e5e5e5";
const CARD = "#161616";
const BORDER = "#2a2a2a";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function textToHtml(value: string) {
  return escapeHtml(value).replace(/\r\n|\n|\r/g, "<br />");
}

export function renderBrandedEmail(params: {
  subject: string;
  message: string;
  recipientName?: string | null;
}) {
  const greeting = params.recipientName?.trim()
    ? `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${BODY};">Hi ${escapeHtml(params.recipientName.trim())},</p>`
    : "";
  const body = textToHtml(params.message.trim());
  const title = escapeHtml(params.subject.trim());
  const site = `https://${BRAND.domain}`;

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:${BLACK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BLACK};padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${CARD};border:1px solid ${BORDER};border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:22px 28px;background:${BLACK};border-bottom:3px solid ${LIME};">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${LIME};">Onyx Capital</p>
                <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#ffffff;">${title}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                ${greeting}
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${BODY};">${body}</div>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                  <tr>
                    <td style="border-radius:999px;background:${LIME};">
                      <a href="${site}/dashboard" style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:${BLACK};text-decoration:none;">Open dashboard</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:${BLACK};border-top:1px solid ${BORDER};">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};">
                  ${escapeHtml(BRAND.fullName)} · <a href="${site}" style="color:${LIME};text-decoration:none;">${BRAND.domain}</a><br />
                  Questions? Reply to this email or write ${escapeHtml(BRAND.supportEmail)}.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
