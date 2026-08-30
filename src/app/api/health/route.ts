import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = { app: "ok" };

  try {
    getSupabaseEnv();
    checks.supabase = "configured";
  } catch {
    checks.backend = "not_connected";
    return NextResponse.json({
      status: "ok",
      checks,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    status: "ok",
    checks,
    timestamp: new Date().toISOString(),
  });
}
