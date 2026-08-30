import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { tickMemeCoinPrices } from "@/lib/meme-coins/live-prices";
import { utcToday } from "@/lib/meme-coins/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const result = await tickMemeCoinPrices(supabase, utcToday());

    return NextResponse.json({
      ok: true,
      listDate: utcToday(),
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Tick failed" },
      { status: 500 }
    );
  }
}
