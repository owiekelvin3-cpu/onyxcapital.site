import { NextResponse } from "next/server";
import { getCachedLiveMarketPairs } from "@/lib/live-prices";

export const dynamic = "force-dynamic";

export async function GET() {
  const pairs = await getCachedLiveMarketPairs();

  return NextResponse.json(
    { pairs, updatedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}
