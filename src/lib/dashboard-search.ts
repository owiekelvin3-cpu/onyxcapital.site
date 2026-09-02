export type DashboardSearchItem = {
  id: string;
  href: string;
  labelKey?: string;
  label?: string;
  groupKey?: string;
  group?: string;
  keywords?: string[];
};

export const DASHBOARD_SEARCH_ITEMS: DashboardSearchItem[] = [
  {
    id: "overview",
    href: "/dashboard",
    labelKey: "dashboard.navDashboard",
    groupKey: "dashboard.navGroupOverview",
    keywords: ["home", "overview", "balance", "dashboard"],
  },
  {
    id: "trade",
    href: "/dashboard/trade",
    labelKey: "dashboard.navTrade",
    groupKey: "dashboard.navGroupOverview",
    keywords: ["trade", "live", "spot", "chart", "buy", "sell", "forex", "crypto"],
  },
  {
    id: "holdings",
    href: "/dashboard/holdings",
    labelKey: "dashboard.navHoldings",
    groupKey: "dashboard.navGroupOverview",
    keywords: ["holdings", "assets", "balance", "fund holding", "bitcoin", "stocks"],
  },
  {
    id: "portfolio",
    href: "/dashboard/portfolio",
    labelKey: "dashboard.navPortfolio",
    groupKey: "dashboard.navGroupOverview",
    keywords: ["wallet", "holdings", "assets", "portfolio"],
  },
  {
    id: "deposit",
    href: "/dashboard/deposit",
    labelKey: "dashboard.navDeposit",
    groupKey: "dashboard.navGroupCash",
    keywords: ["fund", "add money", "top up", "deposit"],
  },
  {
    id: "deposit-crypto",
    href: "/dashboard/deposit/crypto",
    labelKey: "deposits.cryptoTitle",
    groupKey: "dashboard.navGroupCash",
    keywords: ["bitcoin", "btc", "usdt", "ethereum", "crypto deposit"],
  },
  {
    id: "deposit-gift",
    href: "/dashboard/deposit/gift-card",
    labelKey: "deposits.giftCardTitle",
    groupKey: "dashboard.navGroupCash",
    keywords: ["amazon", "apple", "steam", "visa", "gift card"],
  },
  {
    id: "withdraw",
    href: "/dashboard/withdraw",
    labelKey: "dashboard.navWithdraw",
    groupKey: "dashboard.navGroupCash",
    keywords: ["cash out", "payout", "withdrawal", "withdraw"],
  },
  {
    id: "transactions",
    href: "/dashboard/transactions",
    labelKey: "dashboard.navTransactions",
    groupKey: "dashboard.navGroupOverview",
    keywords: ["history", "activity", "transactions", "trades"],
  },
  {
    id: "notifications",
    href: "/dashboard/notifications",
    labelKey: "dashboard.notifications",
    groupKey: "dashboard.navGroupAccount",
    keywords: ["alerts", "bell", "notifications"],
  },
  {
    id: "ai-trading",
    href: "/dashboard/ai-trading",
    labelKey: "dashboard.aiTrading",
    groupKey: "dashboard.navGroupTools",
    keywords: ["bot", "automated", "ai"],
  },
  {
    id: "copy-trading",
    href: "/dashboard/copy-trading",
    labelKey: "dashboard.copyTrading",
    groupKey: "dashboard.navGroupTools",
    keywords: ["copy", "traders", "mirror"],
  },
  {
    id: "referrals",
    href: "/dashboard/referrals",
    labelKey: "dashboard.referrals",
    groupKey: "dashboard.navGroupProducts",
    keywords: ["affiliate", "invite", "referral", "bonus"],
  },
  {
    id: "signals",
    href: "/dashboard/signals",
    labelKey: "dashboard.signals",
    groupKey: "dashboard.navGroupProducts",
    keywords: ["signal", "ideas", "trading room"],
  },
  {
    id: "analytics",
    href: "/dashboard/analytics",
    label: "Market Analytics",
    groupKey: "dashboard.navGroupTools",
    keywords: ["charts", "markets", "analysis", "analytics"],
  },
  {
    id: "kyc",
    href: "/dashboard/kyc",
    labelKey: "dashboard.kyc",
    groupKey: "dashboard.navGroupAccount",
    keywords: ["verification", "identity", "id", "kyc"],
  },
  {
    id: "settings",
    href: "/dashboard/settings",
    labelKey: "dashboard.settings",
    groupKey: "dashboard.navGroupAccount",
    keywords: ["preferences", "settings"],
  },
  {
    id: "settings-account",
    href: "/dashboard/settings/account",
    label: "Security & Privacy",
    groupKey: "dashboard.navGroupAccount",
    keywords: ["password", "security", "privacy", "account"],
  },
  {
    id: "settings-notifications",
    href: "/dashboard/settings/notifications",
    label: "Notification settings",
    groupKey: "dashboard.navGroupAccount",
    keywords: ["alerts", "sound", "push", "notifications"],
  },
  {
    id: "settings-profile",
    href: "/dashboard/settings/profile",
    label: "Profile settings",
    groupKey: "dashboard.navGroupAccount",
    keywords: ["name", "avatar", "profile"],
  },
  {
    id: "support",
    href: "/dashboard/support",
    labelKey: "dashboard.support",
    groupKey: "dashboard.navGroupAccount",
    keywords: ["help", "chat", "contact", "support"],
  },
];

function itemLabel(item: DashboardSearchItem, t: (key: string) => string) {
  if (item.labelKey) return t(item.labelKey);
  return item.label ?? item.href;
}

function itemGroup(item: DashboardSearchItem, t: (key: string) => string) {
  if (item.groupKey) return t(item.groupKey);
  return item.group ?? "";
}

export function filterDashboardSearchItems(
  query: string,
  t: (key: string) => string,
  limit = 12
): DashboardSearchItem[] {
  const q = query.trim().toLowerCase();

  if (!q) {
    return DASHBOARD_SEARCH_ITEMS.slice(0, limit);
  }

  const terms = q.split(/\s+/).filter(Boolean);

  return DASHBOARD_SEARCH_ITEMS.filter((item) => {
    const haystack = [
      itemLabel(item, t),
      itemGroup(item, t),
      item.href,
      ...(item.keywords ?? []),
    ]
      .join(" ")
      .toLowerCase();

    return terms.every((term) => haystack.includes(term));
  }).slice(0, limit);
}
