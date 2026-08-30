"use client";

import { useState } from "react";
import { DEPOSIT_CRYPTO_KEYS, DEPOSIT_CRYPTO_LABELS, GIFT_CARD_BRANDS, type GiftCardBrand } from "@/lib/deposit-options";
import { CryptoIcon } from "@/components/crypto/CryptoIcon";
import { cn } from "@/lib/utils";

type GiftCardIconSize = "sm" | "md" | "lg";

const ICON_SIZE: Record<GiftCardIconSize, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};

const TILE_SIZE: Record<GiftCardIconSize, string> = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-16 w-16",
};

export function GiftCardBrandIcon({
  brand,
  size = "md",
  className,
}: {
  brand: GiftCardBrand;
  size?: GiftCardIconSize;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={cn(
          ICON_SIZE[size],
          "flex items-center justify-center rounded-lg text-[11px] font-bold text-white",
          className
        )}
        style={{ backgroundColor: brand.color }}
        aria-hidden
      >
        {brand.label.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={brand.iconUrl}
      alt={brand.label}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(ICON_SIZE[size], "object-contain", className)}
    />
  );
}

export function GiftCardBrandTile({
  brand,
  size = "md",
  selected,
}: {
  brand: GiftCardBrand;
  size?: GiftCardIconSize;
  selected?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ring-1 ring-black/5 dark:bg-bg-primary dark:ring-white/10",
        TILE_SIZE[size],
        selected ? "border-brand/50 ring-2 ring-brand/30" : "border-border/80"
      )}
    >
      <span className="h-1.5 w-full shrink-0" style={{ backgroundColor: brand.color }} aria-hidden />
      <span className="flex flex-1 items-center justify-center px-1.5 pb-1">
        <GiftCardBrandIcon brand={brand} size={size} />
      </span>
    </div>
  );
}

export function CryptoDepositPreview({ size = "md" }: { size?: "md" | "lg" }) {
  const keys = DEPOSIT_CRYPTO_KEYS.slice(0, 6);
  const iconSize = size === "lg" ? "md" : "sm";

  return (
    <div className={cn("grid shrink-0 gap-1.5", size === "lg" ? "grid-cols-3 w-[88px]" : "grid-cols-3 w-[72px]")}>
      {keys.map((key) => (
        <CryptoIcon key={key} symbol={key} label={DEPOSIT_CRYPTO_LABELS[key]} size={iconSize} />
      ))}
    </div>
  );
}

export function GiftCardDepositPreview({ size = "md" }: { size?: "md" | "lg" }) {
  const brands = GIFT_CARD_BRANDS;
  const tileSize = size === "lg" ? "sm" : "sm";

  return (
    <div className={cn("grid shrink-0 grid-cols-3 gap-1.5", size === "lg" ? "w-[96px]" : "w-[84px]")}>
      {brands.map((brand) => (
        <GiftCardBrandTile key={brand.id} brand={brand} size={tileSize} />
      ))}
    </div>
  );
}
