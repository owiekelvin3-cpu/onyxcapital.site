"use client";

import { useState } from "react";
import { cryptoIconUrl } from "@/lib/crypto-assets";
import { cn } from "@/lib/utils";

type CryptoIconSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASS: Record<CryptoIconSize, string> = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const TILE_CLASS: Record<CryptoIconSize, string> = {
  xs: "h-7 w-7",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

export function CryptoIcon({
  symbol,
  label,
  size = "sm",
  tile = true,
  selected,
  className,
}: {
  symbol: string;
  label?: string;
  size?: CryptoIconSize;
  tile?: boolean;
  selected?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const alt = label ?? symbol;

  const image = failed ? (
    <span
      className={cn(
        SIZE_CLASS[size],
        "flex items-center justify-center rounded-full bg-bg-hover text-[10px] font-bold text-text-secondary"
      )}
    >
      {symbol.slice(0, 3)}
    </span>
  ) : (
    <img
      src={cryptoIconUrl(symbol)}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn(SIZE_CLASS[size], "object-contain", className)}
    />
  );

  if (!tile) return image;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5",
        TILE_CLASS[size],
        selected && "ring-2 ring-brand/50 ring-offset-1 ring-offset-bg-secondary"
      )}
    >
      {image}
    </span>
  );
}

export function BrandIcon({
  src,
  alt,
  size = "sm",
  tile = true,
  selected,
  fallback,
  fallbackBg,
}: {
  src: string;
  alt: string;
  size?: CryptoIconSize;
  tile?: boolean;
  selected?: boolean;
  fallback?: string;
  fallbackBg?: string;
}) {
  const [failed, setFailed] = useState(false);

  const content =
    failed && fallback ? (
      <span
        className={cn(
          SIZE_CLASS[size],
          "flex items-center justify-center rounded-lg text-[11px] font-bold text-white"
        )}
        style={{ backgroundColor: fallbackBg ?? "#333" }}
      >
        {fallback}
      </span>
    ) : (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn(SIZE_CLASS[size], "object-contain")}
      />
    );

  if (!tile) return content;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 overflow-hidden",
        TILE_CLASS[size],
        selected && "ring-2 ring-brand/50 ring-offset-1 ring-offset-bg-secondary"
      )}
    >
      {content}
    </span>
  );
}
