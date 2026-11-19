import { NextResponse } from "next/server";
import { issueSignupCode, type SignupEmailInput } from "@/lib/auth/issue-auth-code";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: SignupEmailInput;
  try {
    body = (await request.json()) as SignupEmailInput;
  } catch {
    return NextResponse.json({ error: "Enter your account details and try again." }, { status: 400 });
  }

  const result = await issueSignupCode(body);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, created: Boolean(result.created) },
      { status: result.status }
    );
  }

  return NextResponse.json({ ok: true });
}
