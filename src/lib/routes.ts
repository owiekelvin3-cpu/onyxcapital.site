/** Central route map — every nav/footer label resolves here */
export const SITE_ROUTES: Record<string, string> = {
  // Buy Crypto
  "Express Buy": "/register",
  "P2P Trading": "/register",
  Convert: "/register",

  // Markets
  Spot: "/markets",
  Futures: "/markets",
  Options: "/markets",
  Stocks: "/markets",
  Forex: "/markets",

  // Trade nav
  "Spot Trading": "/markets",
  Margin: "/markets",

  // Earn
  Staking: "/dashboard/ai-trading",
  Savings: "/dashboard/deposit",
  "Dual Investment": "/dashboard/ai-trading",
  Launchpool: "/register",

  // More
  API: "/help",
  Affiliate: "/dashboard/referrals",
  Referral: "/dashboard/referrals",
  Features: "/features",
  Pricing: "/fees",
  Plans: "/plans",

  // Footer — About
  "About Us": "/about",
  Careers: "/about",
  Press: "/about",
  Blog: "/about",
  Community: "/community",

  // Footer — Products
  Exchange: "/products",
  "Copy Trading": "/dashboard/copy-trading",
  Earn: "/dashboard/ai-trading",
  Institutional: "/about",
  Products: "/products",
  Markets: "/markets",
  Trading: "/trading",

  // Footer — Service
  Fees: "/fees",
  "Trading Rules": "/fees",
  "API Documentation": "/help",

  // Footer — Support
  "Help Center": "/help",
  "Submit a Request": "/help",
  "Law Enforcement": "/help",
  "Bug Bounty": "/help",

  // Footer — Legal
  "Terms of Use": "/terms",
  Terms: "/terms",
  Privacy: "/privacy",
  "Privacy Policy": "/privacy",
  "Cookie Preferences": "/privacy",
};

export function siteRoute(label: string): string {
  return SITE_ROUTES[label] ?? "/help";
}

export const SITE_PAGES: Record<
  string,
  { title: string; description: string; content: string[] }
> = {
  about: {
    title: "About Onyx Capital",
    description: "Learn about Onyx Capital — our mission, team, and vision.",
    content: [
      "Onyx Capital is a multi-asset trading platform for crypto, stocks, forex, and derivatives.",
      "Trade confidently and securely. Learn proven strategies from industry experts to grow capital — with copy trading, signals, mining, and staking in one account.",
      "We built Onyx Capital to keep trading straightforward: clear fees, a single dashboard, and tools that work on desktop and mobile web.",
      "Security comes first — encrypted sessions, optional two-factor authentication, and careful handling of account data.",
      "We're a growing team focused on shipping useful features, listening to feedback, and improving the platform over time.",
    ],
  },
  help: {
    title: "Help Center",
    description: "Get support and find answers to common questions.",
    content: [
      "Welcome to the Onyx Capital Help Center. Find answers to the most common questions below.",
      "Account & Registration: Create a free account at onyxcapital.site/register. Verification (KYC) is required for withdrawals over $10,000.",
      "Deposits: Navigate to Dashboard → Deposit. Select your asset and send crypto to the displayed wallet address. Deposits typically confirm within 1–24 hours after team approval.",
      "Trading: Use Copy Trading, AI Trading, or Trading Signals from your dashboard. Fund your account first under Dashboard → Deposit.",
      "Withdrawals: Dashboard → Withdraw. Choose crypto wallet, bank transfer, international wire, PayPal/e-wallet, debit card, mobile money, or Cash App/Venmo/Zelle. Enter payout details and amount — our team processes requests within 1–5 business days depending on method.",
      "Security: Enable 2FA in Settings. Never share your password or API keys. Onyx Capital will never ask for your credentials via email.",
      "Copy trading: select experts to follow and trades are mirrored automatically at your allocation. Pause or change experts anytime.",
      "Mining: after payment, hashing starts on your contract. First output is typically released after 48 hours, then daily.",
      "Staking: lock a term from 30 to 360 days. Published plan returns range from 5% to 25% depending on duration.",
      "Need more help? Open Dashboard → Support for live chat with our team, or email Onyxcapitalsupport@gmail.com — available 24/7.",
    ],
  },
  terms: {
    title: "Terms of Use",
    description:
      "The rules, rights, and responsibilities that govern your use of Onyx Capital.",
    content: [
      "Last updated: August 2026",
      "See the full Terms of Use for eligibility, trading rules, risk disclosures, and legal contact information.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    description:
      "How Onyx Capital collects, uses, shares, and protects your personal information.",
    content: [
      "Last updated: August 2026",
      "See the full Privacy Policy for data collection, security measures, your rights, and cookie preferences.",
    ],
  },
  fees: {
    title: "Fees & Trading Rules",
    description: "Transparent fee schedule and trading rules.",
    content: [
      "Trading Fees: Maker 0.10% | Taker 0.10%. VIP tiers available with reduced fees based on 30-day volume.",
      "Withdrawal Fees: Vary by asset. BTC ~0.0005 BTC | ETH ~0.005 ETH | USDT ~$1.00 network fee.",
      "Deposit Fees: Free for all crypto deposits.",
      "Minimum Trade: $10 USD equivalent.",
      "Minimum Withdrawal: $50 USD equivalent.",
      "Trading Rules: All orders are executed at market price for market orders. Limit orders execute when price reaches your specified level.",
      "Market manipulation, wash trading, and abusive order patterns are prohibited and may result in account suspension.",
    ],
  },
};

/** Slugs handled by [slug] dynamic route — used to avoid conflicts */
export const INFO_SLUGS = new Set(Object.keys(SITE_PAGES));
