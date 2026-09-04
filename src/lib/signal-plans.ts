export type SignalTier = "newbie" | "bronze" | "silver" | "gold" | "platinum";

export type SignalPlan = {
  id: SignalTier;
  name: string;
  price: number;
  days: number;
  pct: number;
  description: string;
};

export const SIGNAL_PLANS: SignalPlan[] = [
  {
    id: "newbie",
    name: "NEWBIE",
    price: 1500,
    days: 14,
    pct: 20,
    description:
      "Basic entry-level signals with lower risk, designed for beginners learning how signals work.",
  },
  {
    id: "bronze",
    name: "BRONZE",
    price: 2000,
    days: 21,
    pct: 40,
    description:
      "Low to moderate confidence signals, suitable for cautious traders building consistency.",
  },
  {
    id: "silver",
    name: "SILVER",
    price: 3000,
    days: 100,
    pct: 60,
    description: "Well-researched signals with solid setups and balanced risk-to-reward.",
  },
  {
    id: "gold",
    name: "GOLD",
    price: 3500,
    days: 165,
    pct: 80,
    description:
      "High-confidence signals backed by strong market confluence and clear confirmations.",
  },
  {
    id: "platinum",
    name: "PLATINUM",
    price: 5000,
    days: 365,
    pct: 100,
    description:
      "Premium, top-tier signals with the highest conviction, precision entries, and optimal risk management.",
  },
];

/** Legacy tier ids still stored on older rows or admin desk publishes. */
const TIER_RANK: Record<string, number> = {
  basic: 1,
  starter: 1,
  newbie: 1,
  bronze: 2,
  pro: 2,
  professional: 2,
  silver: 3,
  vip: 3,
  elite: 3,
  gold: 4,
  institutional: 4,
  platinum: 5,
  premier: 5,
  executive: 6,
  sovereign: 7,
};

export function signalTierRank(tier: string | null | undefined): number {
  if (!tier) return 0;
  return TIER_RANK[tier.toLowerCase()] ?? 0;
}

export function signalPlanById(id: string) {
  return SIGNAL_PLANS.find((p) => p.id === id);
}

export function signalPlanPct(tier: string | null | undefined): number {
  if (!tier) return 0;
  const plan = SIGNAL_PLANS.find((p) => p.id === tier.toLowerCase());
  if (plan) return plan.pct;
  const rank = signalTierRank(tier);
  if (rank >= 5) return 100;
  if (rank === 4) return 80;
  if (rank === 3) return 60;
  if (rank === 2) return 40;
  if (rank === 1) return 20;
  return 0;
}

export function signalTierLabel(tier: string) {
  const plan = SIGNAL_PLANS.find((p) => p.id === tier);
  if (plan) return plan.name;
  if (tier === "vip") return "VIP";
  if (tier === "pro") return "Pro";
  if (tier === "basic") return "Basic";
  return tier;
}

export function userTierRankFromPackages(
  packages: Array<{ package_id?: string | null; status: string; expires_at?: string | null }>
): number {
  const now = Date.now();
  const active = packages.filter(
    (p) =>
      p.status === "active" &&
      (!p.expires_at || new Date(p.expires_at).getTime() > now)
  );
  if (active.length === 0) return 0;
  return Math.max(...active.map((p) => signalTierRank(p.package_id)));
}

export type ActiveSignalPlan = {
  id: string;
  name: string;
  expiresAt: string | null;
};

export function activeSignalPlanFromPackages(
  packages: Array<{
    package_id?: string | null;
    package_name?: string | null;
    status: string;
    expires_at?: string | null;
  }>
): ActiveSignalPlan | null {
  const now = Date.now();
  const active = packages.filter(
    (p) =>
      p.status === "active" &&
      (!p.expires_at || new Date(p.expires_at).getTime() > now)
  );
  if (active.length === 0) return null;

  const best = active.reduce((top, row) =>
    signalTierRank(row.package_id) > signalTierRank(top.package_id) ? row : top
  );
  const plan = best.package_id ? signalPlanById(best.package_id) : undefined;

  return {
    id: plan?.id ?? best.package_id ?? "",
    name: plan?.name ?? signalTierLabel(best.package_id ?? best.package_name ?? ""),
    expiresAt: best.expires_at ?? null,
  };
}
