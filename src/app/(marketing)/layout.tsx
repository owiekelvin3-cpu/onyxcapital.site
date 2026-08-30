import { FinMarketingMobileBar, FinMarketingSidebar } from "@/components/marketing/fin/FinMarketingShell";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fin-marketing flex min-h-dvh w-full min-w-0 flex-col overflow-x-clip lg:flex-row">
      <FinMarketingSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <FinMarketingMobileBar />
        <main className="flex-1 px-4 py-5 safe-area-x sm:px-6 sm:py-6 lg:px-8 lg:py-8">{children}</main>
        <MarketingFooter />
      </div>
    </div>
  );
}
