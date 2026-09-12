import type { SupabaseClient } from "@supabase/supabase-js";
import { BRAND } from "@/lib/constants";
import { renderBrandedEmail } from "@/lib/mail/branded-email";

export type MailRecipient = {
  id: string;
  email: string;
  full_name: string | null;
};

const BATCH_SIZE = 100;

export function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function resendFromAddress() {
  return (
    process.env.RESEND_FROM?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    `${BRAND.name} <support@${BRAND.domain}>`
  );
}

export function isDeliverableEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function uniqueRecipients(rows: MailRecipient[]) {
  const seen = new Set<string>();
  const out: MailRecipient[] = [];
  for (const row of rows) {
    const email = row.email?.trim().toLowerCase();
    if (!email || !isDeliverableEmail(email) || seen.has(email)) continue;
    seen.add(email);
    out.push({ ...row, email });
  }
  return out;
}

export async function listMailRecipients(
  supabase: SupabaseClient,
  userId?: string | null
): Promise<MailRecipient[]> {
  if (userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return uniqueRecipients(data ? [data as MailRecipient] : []);
  }

  const pageSize = 1000;
  const rows: MailRecipient[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = (data as MailRecipient[]) ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return uniqueRecipients(rows);
}

async function sendResendBatch(
  payloads: Array<{ from: string; to: string[]; subject: string; html: string; reply_to: string }>
) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY is not configured.");

  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payloads),
  });

  const json = (await res.json().catch(() => ({}))) as {
    data?: Array<{ id?: string }>;
    message?: string;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(json.error?.message || json.message || `Resend ${res.status}`);
  }

  return json.data?.length ?? payloads.length;
}

export async function sendBrandedBroadcast(params: {
  subject: string;
  message: string;
  recipients: MailRecipient[];
}) {
  const from = resendFromAddress();
  const replyTo = BRAND.supportEmail;
  let sent = 0;
  let failed = 0;
  let lastError = "";

  for (let i = 0; i < params.recipients.length; i += BATCH_SIZE) {
    const chunk = params.recipients.slice(i, i + BATCH_SIZE);
    const payloads = chunk.map((recipient) => ({
      from,
      to: [recipient.email],
      subject: params.subject,
      reply_to: replyTo,
      html: renderBrandedEmail({
        subject: params.subject,
        message: params.message,
        recipientName: recipient.full_name,
      }),
    }));

    try {
      sent += await sendResendBatch(payloads);
    } catch (error) {
      failed += chunk.length;
      lastError = error instanceof Error ? error.message : "Resend batch failed";
    }

    if (i + BATCH_SIZE < params.recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  return { sent, failed, lastError };
}
