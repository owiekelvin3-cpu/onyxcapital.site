import Link from "next/link";
import { FinMarketingMobileBar, FinMarketingSidebar } from "@/components/marketing/fin/FinMarketingShell";
import { FinLegalPage } from "@/components/marketing/fin/FinLegalPage";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { isLegalSlug, LEGAL_PAGES } from "@/lib/legal-content";
import { SITE_PAGES } from "@/lib/routes";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return Object.keys(SITE_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = SITE_PAGES[slug];
  if (!page) return { title: "Not Found" };
  return { title: `${page.title} | Onyx Capital`, description: page.description };
}

export default async function SitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = SITE_PAGES[slug];
  if (!page) notFound();

  if (isLegalSlug(slug)) {
    return (
      <div className="fin-marketing flex min-h-dvh w-full min-w-0 flex-col overflow-x-clip lg:flex-row">
        <FinMarketingSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
          <FinMarketingMobileBar />
          <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <FinLegalPage page={LEGAL_PAGES[slug]} />
          </main>
          <MarketingFooter />
        </div>
      </div>
    );
  }

  return (
    <div className="fin-marketing flex min-h-dvh w-full min-w-0 flex-col overflow-x-clip lg:flex-row">
      <FinMarketingSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <FinMarketingMobileBar />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-3xl">
            <div className="fin-card p-6 sm:p-8">
              <Link
                href="/"
                className="mb-6 inline-block text-[13px] font-medium text-text-secondary hover:text-text-primary"
              >
                ← Back to home
              </Link>
              <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">{page.title}</h1>
              <p className="mt-2 text-sm text-text-tertiary">{page.description}</p>
              <div className="mt-8 space-y-4">
                {page.content.map((paragraph, i) => (
                  <p key={i} className="text-[14px] leading-relaxed text-text-secondary sm:text-[15px]">
                    {paragraph}
                  </p>
                ))}
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="fin-btn-primary inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold transition-transform hover:scale-[1.02]"
                >
                  Get Started
                </Link>
                <Link
                  href="/help"
                  className="inline-flex h-11 items-center rounded-full border border-border px-6 text-sm text-text-primary transition-colors hover:bg-bg-hover"
                >
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </main>
        <MarketingFooter />
      </div>
    </div>
  );
}
