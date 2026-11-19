import { NextResponse } from "next/server";
import { issueRecoveryCode } from "@/lib/auth/issue-auth-code";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let email: unknown;
  try {
    const body = (await request.json()) as { email?: unknown };
    email = body.email;
  } catch {
    return NextResponse.json({ error: "Enter the email on your account." }, { status: 400 });
  }

  const result = await issueRecoveryCode(email);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
