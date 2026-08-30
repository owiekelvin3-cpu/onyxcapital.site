"use client";

import Link from "next/link";
import type { LegalPage } from "@/lib/legal-content";
import { cn } from "@/lib/utils";
import {
  FileCheck,
  FileLines,
  Lock,
  Shield,
} from "@/components/icons";
import {
  LegalBulletList,
  LegalCtaBanner,
  LegalFactPill,
  LegalHeroBackground,
  LegalHeroMeta,
  LegalHeroTitle,
  LegalHighlight,
  LegalParagraph,
  LegalParallaxBadge,
  LegalScrollProgress,
  LegalSectionCard,
  LegalToc,
  useLegalScrollSpy,
} from "@/components/marketing/fin/legal-motion";

type Props = {
  page: LegalPage;
};

export function FinLegalPage({ page }: Props) {
  const sectionIds = page.sections.map((s) => s.id);
  const activeId = useLegalScrollSpy(sectionIds);
  const isPrivacy = page.slug === "privacy";
  const Icon = isPrivacy ? Shield : FileLines;
  const sibling = isPrivacy
    ? { href: "/terms", label: "Terms of Use" }
    : { href: "/privacy", label: "Privacy Policy" };

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="legal-page relative">
      <LegalScrollProgress />
      <LegalHeroBackground variant={page.slug} />

      <div className="relative mx-auto max-w-6xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          ← Back to home
        </Link>

        <header className="legal-hero relative mb-10 sm:mb-14">
          <LegalParallaxBadge>
            <Icon className="h-4 w-4 text-[var(--brand-accent)]" />
            <span>{isPrivacy ? "Privacy & Data" : "Legal Agreement"}</span>
            {isPrivacy ? <Lock className="h-3.5 w-3.5 opacity-60" /> : <FileCheck className="h-3.5 w-3.5 opacity-60" />}
          </LegalParallaxBadge>

          <LegalHeroTitle>{page.title}</LegalHeroTitle>

          <LegalHeroMeta>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
              {page.description}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-text-tertiary">
              <span className="legal-meta-chip">Last updated {page.lastUpdated}</span>
              <span className="legal-meta-chip">Effective {page.effectiveDate}</span>
              <span className="legal-meta-chip">{page.contactEmail}</span>
            </div>
          </LegalHeroMeta>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {page.quickFacts.map((fact, i) => (
              <LegalFactPill key={fact.label} label={fact.label} value={fact.value} index={i} />
            ))}
          </div>
        </header>

        <div className="mb-6 lg:hidden">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            Jump to section
          </p>
          <div className="scroll-tabs flex gap-2 overflow-x-auto pb-1">
            {page.sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  activeId === section.id
                    ? "border-brand bg-brand/10 text-text-primary"
                    : "border-border bg-bg-secondary text-text-secondary"
                )}
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <LegalToc
                sections={page.sections.map((s) => ({ id: s.id, title: s.title }))}
                activeId={activeId}
                onNavigate={scrollToSection}
              />
              <div className="mt-6 rounded-2xl border border-border bg-bg-secondary/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Related
                </p>
                <Link
                  href={sibling.href}
                  className="mt-2 block text-sm font-medium text-brand hover:underline"
                >
                  Read {sibling.label} →
                </Link>
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            {page.sections.map((section, index) => (
              <LegalSectionCard
                key={section.id}
                id={section.id}
                index={index}
                title={section.title}
                summary={section.summary}
              >
                {section.paragraphs.map((paragraph) => (
                  <LegalParagraph key={paragraph.slice(0, 40)}>{paragraph}</LegalParagraph>
                ))}
                {section.bullets && section.bullets.length > 0 && (
                  <LegalBulletList items={section.bullets} />
                )}
                {section.highlight && <LegalHighlight>{section.highlight}</LegalHighlight>}
              </LegalSectionCard>
            ))}

            <LegalCtaBanner>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-bold text-text-primary">
                    {isPrivacy ? "Questions about your data?" : "Ready to trade on Onyx Capital?"}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {isPrivacy
                      ? "Our privacy team responds to data requests within 30 days."
                      : "Create an account to access markets, portfolio tools, and secure withdrawals."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/register"
                    className={cn(
                      "fin-btn-primary inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold",
                      "transition-transform hover:scale-[1.02]"
                    )}
                  >
                    Get Started
                  </Link>
                  <Link
                    href="/help"
                    className="inline-flex h-11 items-center rounded-full border border-border px-6 text-sm font-medium text-text-primary transition-colors hover:bg-bg-hover"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>
            </LegalCtaBanner>
          </div>
        </div>
      </div>
    </div>
  );
}
