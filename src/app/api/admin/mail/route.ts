import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-route";
import { createServiceClient } from "@/lib/supabase/service";
import { listMailRecipients, resendConfigured, sendBrandedBroadcast } from "@/lib/mail/resend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type MailBody = {
  subject?: string;
  message?: string;
  userId?: string | null;
};

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const recipients = await listMailRecipients(createServiceClient());
    return NextResponse.json({
      configured: resendConfigured(),
      recipientCount: recipients.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load recipients." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  if (!resendConfigured()) {
    return NextResponse.json(
      { error: "Resend is not configured. Add RESEND_API_KEY on the server." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as MailBody;
  const subject = String(body.subject ?? "").trim();
  const message = String(body.message ?? "").trim();
  const userId = body.userId ? String(body.userId) : null;

  if (subject.length < 2) {
    return NextResponse.json({ error: "Enter an email subject." }, { status: 400 });
  }
  if (message.length < 2) {
    return NextResponse.json({ error: "Write the email message." }, { status: 400 });
  }

  try {
    const recipients = await listMailRecipients(createServiceClient(), userId);
    if (recipients.length === 0) {
      return NextResponse.json({ error: "No users with a valid email address." }, { status: 400 });
    }

    const result = await sendBrandedBroadcast({ subject, message, recipients });
    return NextResponse.json({
      sent: result.sent,
      failed: result.failed,
      recipientCount: recipients.length,
      error: result.failed > 0 ? result.lastError : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send email." },
      { status: 500 }
    );
  }
}
