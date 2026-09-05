export const BRAND = {
  name: "Onyx Capital",
  fullName: "Onyx Capital",
  tagline: "Trade confidently and securely.",
  description:
    "Learn proven strategies from top industry experts to grow your capital. Trade crypto, stocks, and forex on one secure platform.",
  domain: "onyxcapital.site",
  supportEmail: "Onyxcapitalsupport@gmail.com",
} as const;

/** Minimum age (in years) required to create an account. */
export const MIN_ACCOUNT_AGE = 15;

export const NAV = {
  BuyCrypto: ["Express Buy", "P2P Trading", "Convert"],
  Markets: ["Spot", "Futures", "Options", "Stocks", "Forex"],
  Trade: ["Margin", "Futures", "Copy Trading"],
  Earn: ["Staking", "Savings", "Dual Investment", "Launchpool"],
  More: ["API", "Institutional", "Affiliate", "Referral"],
} as const;

export const FOOTER = {
  About: ["About Us", "Careers", "Press", "Blog", "Community"],
  Products: ["Exchange", "Futures", "Copy Trading", "Earn", "Institutional"],
  Service: ["Plans", "Fees", "Trading Rules", "API Documentation"],
  Support: ["Help Center", "Submit a Request", "Law Enforcement", "Bug Bounty"],
  Legal: ["Terms of Use", "Privacy", "Cookie Preferences"],
} as const;

export const PRODUCTS = [
  {
    title: "Futures",
    desc: "Perpetuals and dated contracts with up to 100x leverage and institutional risk controls.",
    cta: "View futures",
    href: "/markets",
  },
  {
    title: "Copy Trading",
    desc: "Follow top performers for free — one click, no subscription fee.",
    cta: "Browse traders",
    href: "/dashboard/copy-trading",
  },
  {
    title: "AI Bots",
    desc: "Automated strategies powered by machine learning. Backtested, monitored, always on.",
    cta: "See strategies",
    href: "/dashboard/ai-trading",
  },
] as const;

export const PLATFORM_HIGHLIGHTS = [
  {
    title: "Bank-grade security",
    desc: "256-bit encryption, cold storage, and real-time fraud monitoring.",
  },
  {
    title: "Transparent pricing",
    desc: "0.10% spot fees. No hidden spreads. What you see is what you pay.",
  },
  {
    title: "Unified platform",
    desc: "Crypto, stocks, forex, and derivatives — one account, one interface.",
  },
  {
    title: "24/7 global markets",
    desc: "Trade around the clock with 99.99% uptime and sub-50ms latency.",
  },
] as const;

export const STEPS = [
  { step: "01", title: "Create account", desc: "Sign up in under 60 seconds with email verification." },
  { step: "02", title: "Verify identity", desc: "Quick KYC unlocks full platform access and higher limits." },
  { step: "03", title: "Start trading", desc: "Fund your account and execute your first order instantly." },
] as const;

export const PLATFORM_STATS = [
  { value: 12, suffix: "M+", label: "Registered users" },
  { value: 500, suffix: "+", label: "Trading pairs" },
  { value: 180, suffix: "+", label: "Countries served" },
  { value: 99.99, suffix: "%", label: "Platform uptime" },
] as const;

export const LIVE_PLATFORM_METRICS = [
  { value: 99.99, suffix: "%", label: "Execution uptime", decimals: 2 },
  { value: 100, suffix: "%", label: "Fee transparency", decimals: 0 },
] as const;

export const PREMIUM_FEATURES = [
  {
    title: "Lightning execution",
    desc: "Orders routed through our proprietary matching engine with median latency under 8ms.",
    tag: "Performance",
  },
  {
    title: "Deep liquidity",
    desc: "Aggregated order books across tier-1 venues ensure tight spreads even in volatile markets.",
    tag: "Markets",
  },
  {
    title: "Smart portfolio",
    desc: "Real-time P&L, allocation breakdowns, and performance analytics in one unified view.",
    tag: "Analytics",
  },
  {
    title: "Institutional API",
    desc: "REST and WebSocket APIs with FIX connectivity for professional trading desks.",
    tag: "Developers",
  },
  {
    title: "Multi-asset custody",
    desc: "Segregated wallets with proof-of-reserves audits published quarterly.",
    tag: "Security",
  },
  {
    title: "Global compliance",
    desc: "Licensed and regulated across major jurisdictions with full AML/KYC infrastructure.",
    tag: "Trust",
  },
] as const;

export const TESTIMONIALS = [
  {
    quote: "Onyx Capital replaced three separate platforms for me. The dashboard alone is worth the switch.",
    name: "Sarah Chen",
    role: "Portfolio Manager, Apex Capital",
  },
  {
    quote: "Sub-10ms execution on spot orders. I've never seen retail infrastructure this polished.",
    name: "Marcus Webb",
    role: "Professional Trader",
  },
  {
    quote: "Our team moved $40M in monthly volume here. Support and compliance are world-class.",
    name: "Elena Rodriguez",
    role: "Head of Trading, Nova Capital Partners",
  },
] as const;

export const SECURITY_FEATURES = [
  "Cold storage for 95% of assets",
  "Multi-signature withdrawal approval",
  "Real-time anomaly detection",
  "SOC 2 Type II certified",
  "Insurance fund coverage",
  "Bug bounty program",
] as const;
