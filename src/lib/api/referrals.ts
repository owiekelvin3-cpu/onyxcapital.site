import type { SupabaseClient } from "@supabase/supabase-js";

export const REFERRAL_BONUS_AMOUNT = 100;

export type ReferralRewardRow = {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  deposit_id: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  created_at: string;
};

export type ReferralStats = {
  referralCode: string;
  inviteCount: number;
  earnedTotal: number;
  rewards: ReferralRewardRow[];
};

export async function validateReferralCode(
  supabase: SupabaseClient,
  code: string
): Promise<boolean> {
  const trimmed = code.trim();
  if (!trimmed) return false;

  const { data, error } = await supabase.rpc("validate_referral_code", {
    p_code: trimmed,
  });

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function getReferralStats(
  supabase: SupabaseClient,
  userId: string
): Promise<ReferralStats> {
  const [{ data: profile, error: profileError }, invitesRes, rewardsRes] = await Promise.all([
    supabase.from("profiles").select("referral_code").eq("id", userId).maybeSingle(),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", userId),
    supabase
      .from("referral_rewards")
      .select("id, referrer_id, referred_user_id, deposit_id, amount, balance_before, balance_after, created_at")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (profileError) throw new Error(profileError.message);
  if (invitesRes.error) throw new Error(invitesRes.error.message);
  if (rewardsRes.error) throw new Error(rewardsRes.error.message);

  const rewards = (rewardsRes.data ?? []) as ReferralRewardRow[];
  const earnedTotal = rewards.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  return {
    referralCode: profile?.referral_code ?? "",
    inviteCount: invitesRes.count ?? 0,
    earnedTotal: Math.round(earnedTotal * 100) / 100,
    rewards,
  };
}
