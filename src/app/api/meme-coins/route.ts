import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureTodayMemeCoinsSeeded } from "@/lib/meme-coins/ensure-seeded";
import { tickMemeCoinPrices } from "@/lib/meme-coins/live-prices";
import { utcToday } from "@/lib/meme-coins/sync";

export const dynamic = "force-dynamic";

async function fetchCoins(date: string, limit: number) {
  const supabase = await createClient();
  return supabase
    .from("daily_meme_coins")
    .select("*")
    .eq("list_date", date)
    .eq("status", "active")
    .eq("source", "trending")
    .order("featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .limit(limit);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? utcToday();
  const limit = Math.min(Number(searchParams.get("limit") ?? "40"), 100);
  const live = searchParams.get("live") === "1";

  if (live && date === utcToday()) {
    try {
      const service = createServiceClient();
      await tickMemeCoinPrices(service, date);
    } catch (tickErr) {
      console.error("meme-coins live tick:", tickErr);
    }
  }

  let { data, error } = await fetchCoins(date, limit);

  if (!error && date === utcToday() && (data?.length ?? 0) === 0) {
    try {
      await ensureTodayMemeCoinsSeeded();
      ({ data, error } = await fetchCoins(date, limit));
    } catch (seedErr) {
      console.error("meme-coins auto-seed:", seedErr);
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { date, coins: data ?? [], updatedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": live
          ? "no-store, max-age=0"
          : "public, s-maxage=15, stale-while-revalidate=30",
      },
    }
  );
}
