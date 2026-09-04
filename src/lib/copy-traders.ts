export type TraderAvatarKind = "anime" | "illustrated" | "gradient" | "pixel" | "emoji" | "photo";

export const TRADER_AVATAR_KINDS: TraderAvatarKind[] = [
  "photo",
  "illustrated",
  "anime",
  "gradient",
  "pixel",
  "emoji",
];

export function isRemoteAvatarUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export type CopyTraderProfile = {
  id?: string;
  name: string;
  handle: string;
  bio: string;
  roi: number;
  followers: number;
  winRate: number;
  rating: number;
  avatarKind: TraderAvatarKind;
  /** DiceBear seed, gradient key, or uploaded image URL when avatarKind is photo */
  avatarSeed: string;
  ringColor: string;
  verified?: boolean;
  badge?: string;
  price: number;
  sectionId: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type CopyTraderRow = {
  id: string;
  name: string;
  handle: string;
  bio: string;
  roi: number;
  followers: number;
  win_rate: number;
  rating: number;
  avatar_kind: TraderAvatarKind;
  avatar_seed: string;
  ring_color: string;
  verified: boolean;
  badge: string | null;
  section_id: string;
  sort_order: number;
  price: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CopyTraderSectionMeta = {
  id: string;
  title: string;
  subtitle: string;
};

export type CopyTraderSection = CopyTraderSectionMeta & {
  traders: CopyTraderProfile[];
};

export const COPY_TRADER_SECTION_META: CopyTraderSectionMeta[] = [
  {
    id: "featured",
    title: "Featured Elite",
    subtitle: "Top verified performers — our original copy trading roster.",
  },
  {
    id: "crypto",
    title: "Crypto Legends",
    subtitle: "On-chain specialists, L1/L2 rotations, and high-conviction alt plays.",
  },
  {
    id: "forex",
    title: "Forex Masters",
    subtitle: "Major pairs, session timing, and macro-driven FX strategies.",
  },
  {
    id: "indices",
    title: "Indices & Commodities",
    subtitle: "Gold, oil, indices, and metals for diversified copy portfolios.",
  },
  {
    id: "scalping",
    title: "Scalping Squad",
    subtitle: "Fast in-and-out traders with high win rates and tight risk control.",
  },
  {
    id: "rising",
    title: "Rising Stars",
    subtitle: "New and trending traders climbing the leaderboard this month.",
  },
];

export function copyTraderPriceFromRoi(roi: number): number {
  if (roi >= 200) return 399;
  if (roi >= 150) return 299;
  if (roi >= 100) return 199;
  if (roi >= 75) return 149;
  if (roi >= 50) return 99;
  return 49;
}

export function sectionTitle(sectionId: string): string {
  return COPY_TRADER_SECTION_META.find((s) => s.id === sectionId)?.title ?? sectionId;
}

export function mapCopyTraderRow(row: CopyTraderRow): CopyTraderProfile {
  const kind = TRADER_AVATAR_KINDS.includes(row.avatar_kind) ? row.avatar_kind : "illustrated";
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    bio: row.bio,
    roi: Number(row.roi),
    followers: Number(row.followers),
    winRate: Number(row.win_rate),
    rating: Number(row.rating),
    avatarKind: isRemoteAvatarUrl(row.avatar_seed) ? "photo" : kind,
    avatarSeed: row.avatar_seed,
    ringColor: row.ring_color,
    verified: row.verified,
    badge: row.badge ?? undefined,
    price: Number(row.price),
    sectionId: row.section_id,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export function groupCopyTradersBySection(traders: CopyTraderProfile[]): CopyTraderSection[] {
  const byId = new Map<string, CopyTraderProfile[]>();
  for (const trader of traders) {
    const id = trader.sectionId || "featured";
    const list = byId.get(id) ?? [];
    list.push(trader);
    byId.set(id, list);
  }

  const known = COPY_TRADER_SECTION_META.map((meta) => ({
    ...meta,
    traders: (byId.get(meta.id) ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  })).filter((section) => section.traders.length > 0);

  const extras = [...byId.keys()]
    .filter((id) => !COPY_TRADER_SECTION_META.some((s) => s.id === id))
    .sort()
    .map((id) => ({
      id,
      title: id,
      subtitle: "",
      traders: (byId.get(id) ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    }));

  return [...known, ...extras];
}

function dicebear(style: string, seed: string, background?: string) {
  const bg = background ? `&backgroundColor=${background}` : "";
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}${bg}`;
}

export function traderAvatarUrl(trader: CopyTraderProfile): string {
  if (isRemoteAvatarUrl(trader.avatarSeed)) {
    return trader.avatarSeed.trim();
  }

  switch (trader.avatarKind) {
    case "anime":
      return dicebear("adventurer", trader.avatarSeed, "ffd5dc,ffdfbf,c0aede");
    case "illustrated":
      return dicebear("lorelei", trader.avatarSeed, "b6e3f4,c0aede,d1d4f9");
    case "pixel":
      return dicebear("pixel-art", trader.avatarSeed, "fef3c7,d1fae5,e0e7ff");
    case "emoji":
      return dicebear("fun-emoji", trader.avatarSeed, "ffedd5,fecdd3,e9d5ff");
    case "photo":
    case "gradient":
    default:
      return dicebear("notionists", trader.avatarSeed || "trader", "e2e8f0,f1f5f9,e0f2fe");
  }
}

export function traderInitials(name: string) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function gradientForSeed(seed: string): [string, string] {
  const palettes: [string, string][] = [
    ["#6366f1", "#a855f7"],
    ["#0ea5e9", "#22d3ee"],
    ["#f97316", "#ef4444"],
    ["#22c55e", "#14b8a6"],
    ["#ec4899", "#f43f5e"],
    ["#eab308", "#f97316"],
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * (i + 1)) % palettes.length;
  return palettes[hash] ?? palettes[0];
}

export function slugFromName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "trader";
}
