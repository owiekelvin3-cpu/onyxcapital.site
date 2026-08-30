"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BRAND, FOOTER } from "@/lib/constants";
import { MARKETING_PAGES } from "@/lib/marketing-nav";
import { siteRoute } from "@/lib/routes";
import { OnyxLogo } from "@/components/brand/OnyxLogo";
import { ChevronDown } from "@/components/icons";
import { cn } from "@/lib/utils";

const FOOTER_SECTIONS = Object.entries(FOOTER).slice(0, 3);

const QUICK_LINKS = [
  { label: "Markets", href: "/markets" },
  { label: "Trading", href: "/trading" },
  { label: "Products", href: "/products" },
  { label: "Help", href: "/help" },
  { label: "About", href: "/about" },
] as const;

const LEGAL_LINKS = ["Terms of Use", "Privacy", "Help Center"] as const;

type FooterLink = { label: string; href: string };

function FooterAccordion({
  title,
  links,
  defaultOpen = false,
}: {
  title: string;
  links: readonly FooterLink[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-primary">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-text-tertiary transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <ul className="space-y-1 border-t border-border px-4 pb-3 pt-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block rounded-lg px-2 py-2 text-[13px] text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MarketingFooter() {
  const platformPages = MARKETING_PAGES.filter((p) => p.href !== "/").slice(0, 6);

  return (
    <footer className="fin-footer relative mt-auto overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand-accent)] to-transparent opacity-80"
        aria-hidden
      />

      <div className="container-app py-5 sm:py-8 lg:py-12 pb-[max(1rem,var(--safe-bottom))]">
        {/* Mobile — compact strip */}
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-primary shadow-sm">
              <OnyxLogo size={20} />
            </span>
            <div className="min-w-0">
              <span className="block truncate text-sm font-bold text-text-primary">{BRAND.name}</span>
              <span className="block truncate text-[11px] text-text-tertiary">{BRAND.tagline}</span>
            </div>
          </Link>
          <Link
            href="/register"
            className="fin-btn-primary shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold"
          >
            Join
          </Link>
        </div>

        {/* Mobile — quick link pills */}
        <div className="scroll-tabs mt-4 flex gap-2 overflow-x-auto pb-0.5 lg:hidden">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-full border border-border bg-bg-primary px-3.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-[var(--brand-accent)]/40 hover:text-text-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile — collapsible sections */}
        <div className="mt-3 space-y-2 lg:hidden">
          <FooterAccordion
            title="Platform"
            links={platformPages.map((p) => ({ label: p.title, href: p.href }))}
            defaultOpen
          />
          {FOOTER_SECTIONS.map(([title, links]) => (
            <FooterAccordion
              key={title}
              title={title}
              links={links.slice(0, 5).map((link) => ({ label: link, href: siteRoute(link) }))}
            />
          ))}
        </div>

        {/* Desktop — full layout */}
        <div className="hidden lg:block">
          <div className="fin-footer-brand mb-8 rounded-[1.5rem] border border-border bg-bg-primary p-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg-secondary">
                <OnyxLogo size={22} />
              </span>
              <div>
                <span className="block font-bold text-text-primary">{BRAND.fullName}</span>
                <span className="text-xs text-text-tertiary">{BRAND.tagline}</span>
              </div>
            </Link>
            <p className="mt-4 max-w-md text-[13px] leading-relaxed text-text-secondary">
              {BRAND.description}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-8">
            <div>
              <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                Platform
              </h4>
              <ul className="space-y-2.5">
                {platformPages.map((page) => (
                  <li key={page.href}>
                    <Link
                      href={page.href}
                      className="block text-[13px] text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {FOOTER_SECTIONS.map(([title, links]) => (
              <div key={title}>
                <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                  {title}
                </h4>
                <ul className="space-y-2.5">
                  {links.slice(0, 5).map((link) => (
                    <li key={link}>
                      <Link
                        href={siteRoute(link)}
                        className="block text-[13px] text-text-secondary transition-colors hover:text-text-primary"
                      >
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="fin-footer-bottom mt-5 flex flex-col gap-3 border-t border-border pt-4 text-[11px] text-text-tertiary sm:text-[12px] lg:mt-8 lg:flex-row lg:items-center lg:justify-between lg:pt-6">
          <p className="text-center lg:text-left">
            &copy; {new Date().getFullYear()} {BRAND.fullName}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 lg:justify-end">
            {LEGAL_LINKS.map((link, i) => (
              <span key={link} className="inline-flex items-center gap-3">
                {i > 0 && <span className="text-border-light hidden sm:inline" aria-hidden>·</span>}
                <Link
                  href={siteRoute(link)}
                  className="transition-colors hover:text-text-primary"
                >
                  {link}
                </Link>
              </span>
            ))}
          </div>

          <p className="hidden text-balance lg:block lg:max-w-xs lg:text-right">
            Markets move fast. Your exchange shouldn&apos;t slow you down.
          </p>
        </div>
      </div>
    </footer>
  );
}
