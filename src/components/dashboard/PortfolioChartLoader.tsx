"use client";

import dynamic from "next/dynamic";

const PortfolioChart = dynamic(
  () =>
    import("@/components/dashboard/PortfolioChart").then((m) => m.PortfolioChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 flex items-center justify-center text-[13px] text-text-tertiary">
        Loading chart...
      </div>
    ),
  }
);

export { PortfolioChart };
