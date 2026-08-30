import type { SupabaseClient } from "@supabase/supabase-js";
import { SIGNAL_PLANS, type SignalPlan, type SignalTier, userTierRankFromPackages } from "@/lib/signal-plans";
import type { SignalPackageRow, TradingSignalRow } from "@/lib/supabase/types";
import { getUsdBalance } from "@/lib/api/trading";

export type UserSignalContext = {
  signalPct: number;
  balance: number;
  tierRank: number;
  activePackages: SignalPackageRow[];
  signals: TradingSignalRow[];
  plans: SignalPlan[];
};

export async function getUserSignalContext(
  supabase: SupabaseClient,
  userId: string
): Promise<UserSignalContext> {
  const [profileRes, balance, packagesRes, signalsRes] = await Promise.all([
    supabase.from("profiles").select("signal_pct").eq("id", userId).maybeSingle(),
    getUsdBalance(supabase, userId),
    supabase
      .from("signal_packages")
      .select("id, user_id, package_name, package_id, price, status, expires_at, admin_granted, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("trading_signals")
      .select(
        "id, symbol, direction, entry_price, target_price, stop_price, status, min_tier, confidence, outcome, notes, published_at, closed_at"
      )
      .order("published_at", { ascending: false })
      .limit(40),
  ]);

  const activePackages = ((packagesRes.data ?? []) as SignalPackageRow[]).filter(
    (p) =>
      p.status === "active" &&
      (!p.expires_at || new Date(p.expires_at).getTime() > Date.now())
  );

  const tierRank = userTierRankFromPackages((packagesRes.data ?? []) as SignalPackageRow[]);

  return {
    signalPct: Number(profileRes.data?.signal_pct ?? 0),
    balance,
    tierRank,
    activePackages,
    signals: (signalsRes.data ?? []) as TradingSignalRow[],
    plans: SIGNAL_PLANS,
  };
}

export async function purchaseSignalPackage(
  supabase: SupabaseClient,
  params: { userId: string; planId: SignalTier }
): Promise<SignalPackageRow> {
  const plan = SIGNAL_PLANS.find((p) => p.id === params.planId);
  if (!plan) throw new Error("Invalid signal plan");

  const expiresAt = new Date(Date.now() + plan.days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("signal_packages")
    .insert({
      user_id: params.userId,
      package_name: plan.name,
      package_id: plan.id,
      price: plan.price,
      status: "active",
      expires_at: expiresAt,
      admin_granted: false,
    })
    .select(
      "id, user_id, package_name, package_id, price, status, expires_at, admin_granted, created_at"
    )
    .single();

  if (error) {
    if (error.message.toLowerCase().includes("insufficient balance")) {
      throw new Error("Insufficient balance. Deposit funds to purchase signals.");
    }
    throw new Error(error.message);
  }

  return data as SignalPackageRow;
}
