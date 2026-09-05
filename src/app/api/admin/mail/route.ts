import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_AUTH_COOKIE } from "@/lib/auth-guards";
import { BRAND } from "@/lib/constants";
import {
  MAIL_FROM_EMAIL,
  SUPPORT_EMAIL,
  getMailTemplate,
  isMailTemplateId,
  renderBrandEmailHtml,
  renderBrandEmailText,
  resolveMailFrom,
  resolveMailReplyTo,
} from "@/lib/brand-email";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const MAX_SUBJECT = 200;
const MAX_BODY = 8000;

type MailBody = {
  userId?: string;
  template?: string;
  subject?: string;
  body?: string;
};

async function verifyAdminRequest() {
  const cookieStore = await cookies();
  if (!cookieStore.get(ADMIN_AUTH_COOKIE)?.value) {
    return { ok: false as const, status: 401, error: "Admin session required" };
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, status: 401, error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false as const, status: 403, error: "Admin access required" };
  }

  return { ok: true as const, adminId: user.id, supabase };
}

function resendErrorMessage(message?: string) {
  const text = message?.trim() || "";
  if (/not verified|gmail\.com domain/i.test(text)) {
    return `Resend cannot send from Gmail. Mail now sends from ${MAIL_FROM_EMAIL}. Add and verify ${BRAND.domain} at https://resend.com/domains, then try again.`;
  }
  return (
    text ||
    `Resend could not send this email. Verify ${BRAND.domain} at https://resend.com/domains.`
  );
}

export async function GET() {
  const auth = await verifyAdminRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json({
    configured: Boolean(process.env.RESEND_API_KEY?.trim()),
    from: resolveMailFrom(),
    replyTo: resolveMailReplyTo(),
    contactEmail: SUPPORT_EMAIL,
  });
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const payload = (await request.json().catch(() => ({}))) as MailBody;
  const userId = payload.userId?.trim() ?? "";
  const templateId = payload.template?.trim() || "general";
  const subject = payload.subject?.trim() ?? "";
  const body = payload.body?.trim() ?? "";

  if (!userId) {
    return NextResponse.json({ error: "Choose a user to email." }, { status: 400 });
  }
  if (!isMailTemplateId(templateId)) {
    return NextResponse.json({ error: "Unknown email template." }, { status: 400 });
  }
  if (subject.length < 2 || subject.length > MAX_SUBJECT) {
    return NextResponse.json(
      { error: `Subject must be between 2 and ${MAX_SUBJECT} characters.` },
      { status: 400 }
    );
  }
  if (body.length < 1 || body.length > MAX_BODY) {
    return NextResponse.json(
      { error: `Message must be between 1 and ${MAX_BODY} characters.` },
      { status: 400 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Email sending is not configured. Add RESEND_API_KEY in Vercel, then try again.",
      },
      { status: 503 }
    );
  }

  const { data: recipient, error: recipientError } = await auth.supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (recipientError) {
    return NextResponse.json({ error: recipientError.message }, { status: 500 });
  }
  if (!recipient?.email) {
    return NextResponse.json({ error: "That user has no email on file." }, { status: 404 });
  }

  const template = getMailTemplate(templateId);
  const html = renderBrandEmailHtml({
    recipientName: recipient.full_name || recipient.email,
    heading: template.heading,
    body,
    subject,
  });
  const text = renderBrandEmailText({
    recipientName: recipient.full_name || recipient.email,
    heading: template.heading,
    body,
  });

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resolveMailFrom(),
      to: [recipient.email],
      reply_to: resolveMailReplyTo(),
      subject,
      html,
      text,
    }),
  });

  const resendPayload = (await resendResponse.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    name?: string;
  };

  if (!resendResponse.ok) {
    return NextResponse.json(
      {
        error: resendErrorMessage(resendPayload.message),
      },
      { status: 502 }
    );
  }

  const notificationTitle = subject.slice(0, 80);
  const notificationMessage = body.slice(0, 280);

  try {
    const writer = (() => {
      try {
        return createServiceClient();
      } catch {
        return auth.supabase;
      }
    })();

    await writer.from("notifications").insert({
      user_id: recipient.id,
      title: notificationTitle,
      message: notificationMessage,
    });

    await writer.from("admin_outbound_emails").insert({
      admin_id: auth.adminId,
      user_id: recipient.id,
      to_email: recipient.email,
      subject,
      template: templateId,
      body,
      status: "sent",
      provider_id: resendPayload.id ?? null,
    });
  } catch {
    /* send succeeded even if history/notification logging fails */
  }

  return NextResponse.json({
    ok: true,
    to: recipient.email,
    subject,
    from: resolveMailFrom(),
    replyTo: resolveMailReplyTo(),
    providerId: resendPayload.id ?? null,
  });
}
