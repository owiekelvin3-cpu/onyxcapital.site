/** TradingView-style marketing site navigation (5 top-level + sub pages) */
export const MARKETING_NAV = [
  { label: "Products", href: "/products" },
  { label: "Community", href: "/community" },
  { label: "Markets", href: "/markets" },
  { label: "Trading", href: "/trading" },
] as const;

export const MARKETING_MORE_LINKS = [
  { label: "Plans", href: "/plans" },
  { label: "Features", href: "/features" },
  { label: "Help Center", href: "/help" },
  { label: "About", href: "/about" },
] as const;

/** All dedicated marketing pages (matches TradingView multi-page structure) */
export const MARKETING_PAGES = [
  { slug: "", title: "Home", href: "/" },
  { slug: "products", title: "Products", href: "/products" },
  { slug: "community", title: "Community", href: "/community" },
  { slug: "markets", title: "Markets", href: "/markets" },
  { slug: "trading", title: "Trading", href: "/trading" },
  { slug: "features", title: "Features", href: "/features" },
  { slug: "plans", title: "Plans", href: "/plans" },
] as const;
