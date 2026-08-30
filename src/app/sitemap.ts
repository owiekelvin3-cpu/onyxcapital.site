import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";
import { MARKETING_PAGES } from "@/lib/marketing-nav";
import { SITE_PAGES } from "@/lib/routes";

/** Public pages only — no auth or dashboard routes */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppUrl();
  const now = new Date();

  const marketing = MARKETING_PAGES.map((page) => ({
    url: page.href === "/" ? base : `${base}${page.href}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: page.href === "/" ? 1 : 0.85,
  }));

  const info = Object.keys(SITE_PAGES).map((slug) => ({
    url: `${base}/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...marketing, ...info];
}
