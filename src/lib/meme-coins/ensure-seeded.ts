import { createServiceClient } from "@/lib/supabase/service";
import { refreshTrendingPrices, runDailyMemeCoinSync, utcToday } from "@/lib/meme-coins/sync";

/** Populate today's meme market if empty (first visit / missed cron). */
export async function ensureTodayMemeCoinsSeeded(): Promise<boolean> {
  const listDate = utcToday();
  const supabase = createServiceClient();

  const { count, error } = await supabase
    .from("daily_meme_coins")
    .select("id", { count: "exact", head: true })
    .eq("list_date", listDate)
    .eq("status", "active")
    .eq("source", "trending");

  if (error) {
    console.error("ensureTodayMemeCoinsSeeded count:", error.message);
    return false;
  }

  if ((count ?? 0) > 0) return false;

  await runDailyMemeCoinSync(supabase);
  await refreshTrendingPrices(supabase, listDate);
  return true;
}
