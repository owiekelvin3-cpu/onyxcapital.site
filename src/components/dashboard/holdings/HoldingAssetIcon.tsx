"use client";

import { BrandIcon, CryptoIcon } from "@/components/crypto/CryptoIcon";

const STOCK_ICONS: Record<string, { src: string; fallback: string; fallbackBg: string }> = {
  AAPL: { src: "https://cdn.simpleicons.org/apple/111111", fallback: "AAPL", fallbackBg: "#111111" },
  MSFT: { src: "https://cdn.simpleicons.org/microsoft/00A4EF", fallback: "MSFT", fallbackBg: "#00A4EF" },
  TSLA: { src: "https://cdn.simpleicons.org/tesla/CC0000", fallback: "TSLA", fallbackBg: "#CC0000" },
  NVDA: { src: "https://cdn.simpleicons.org/nvidia/76B900", fallback: "NVDA", fallbackBg: "#76B900" },
};

export function HoldingAssetIcon({
  ticker,
  name,
  category,
}: {
  ticker: string;
  name: string;
  category: string;
}) {
  if (category === "crypto") {
    return <CryptoIcon symbol={ticker} label={name} size="md" />;
  }

  const stock = STOCK_ICONS[ticker.toUpperCase()];
  if (stock) {
    return (
      <BrandIcon
        src={stock.src}
        alt={name}
        size="md"
        fallback={stock.fallback.slice(0, 1)}
        fallbackBg={stock.fallbackBg}
      />
    );
  }

  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-tertiary text-xs font-bold text-text-primary">
      {ticker.slice(0, 2)}
    </span>
  );
}
