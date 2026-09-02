import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const envPath = resolve(".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.PROJECT_REF;
const resendKey = process.env.RESEND_API_KEY;
const appUrl = "https://onyxcapital.site";
const fromEmail = "noreply@onyxcapital.site";

if (!token || !projectRef) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or PROJECT_REF.");
  process.exit(1);
}

if (!resendKey) {
  console.error("Missing RESEND_API_KEY.");
  process.exit(1);
}

async function patchAuth(body) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(text.slice(0, 800));
    throw new Error(`auth config ${res.status}`);
  }
  return JSON.parse(text);
}

const domains = await fetch("https://api.resend.com/domains", {
  headers: { Authorization: `Bearer ${resendKey}` },
});
if (!domains.ok) {
  console.error("Resend key was rejected.");
  process.exit(1);
}
const domainJson = await domains.json();
const names = (domainJson.data ?? []).map((d) => `${d.name}:${d.status}`).join(", ");
console.log("resend_domains=", names || "none");

const allow = [
  `${appUrl}/**`,
  `${appUrl}/auth/callback`,
  `${appUrl}/verify-email`,
  "https://www.onyxcapital.site/**",
  "https://onyxcapitalsite.vercel.app/**",
  "http://localhost:3000/**",
].join(",");

const base = await patchAuth({
  site_url: appUrl,
  uri_allow_list: allow,
  mailer_autoconfirm: false,
  mailer_otp_length: 6,
  mailer_otp_exp: 3600,
});

console.log("site_url=", base.site_url);
console.log("mailer_autoconfirm=", base.mailer_autoconfirm);
console.log("mailer_otp_length=", base.mailer_otp_length);

const smtp = await patchAuth({
  smtp_admin_email: fromEmail,
  smtp_host: "smtp.resend.com",
  smtp_port: "465",
  smtp_user: "resend",
  smtp_pass: resendKey,
  smtp_sender_name: "Onyx Capital",
  smtp_max_frequency: 1,
});
console.log("smtp_host=", smtp.smtp_host);
console.log("smtp_sender=", smtp.smtp_admin_email);

try {
  await patchAuth({
    mailer_subjects_confirmation: "{{ .Token }} is your Onyx Capital verification code",
    mailer_templates_confirmation_content: `<h2>Verify your Onyx Capital email</h2>
<p>Enter the 6-digit code to finish creating your account:</p>
<p style="font-size:28px;letter-spacing:6px;font-weight:700;">{{ .Token }}</p>
<p>This code expires in 1 hour.</p>
<p>If you did not create an Onyx Capital account, you can ignore this email.</p>`,
    mailer_subjects_recovery: "Reset your Onyx Capital password",
    mailer_templates_recovery_content: `<h2>Reset your password</h2>
<p>Use this 6-digit code to choose a new Onyx Capital password:</p>
<p style="font-size:28px;letter-spacing:6px;font-weight:700;">{{ .Token }}</p>
<p>This code expires in 1 hour.</p>
<p>If you did not request a reset, you can ignore this email.</p>`,
  });
  console.log("email_templates=updated");
} catch {
  console.log("email_templates=blocked");
}
