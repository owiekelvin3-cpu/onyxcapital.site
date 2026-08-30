"use client";

import { useEffect, useState } from "react";
import { ASSET_SYMBOL_MAP, seedEntryPrice } from "@/lib/ai-bots";

export function useAiMarketPrice(cryptoAsset: string) {
  const [price, setPrice] = useState<number>(() => seedEntryPrice(cryptoAsset));
  const symbol = ASSET_SYMBOL_MAP[cryptoAsset] ?? `${cryptoAsset}/USDT`;

  useEffect(() => {
    let cancelled = false;

    async function fetchPrice() {
      try {
        const res = await fetch("/api/prices");
        if (!res.ok) return;
        const json = (await res.json()) as {
          pairs?: Array<{ symbol: string; price: number }>;
        };
        const match = json.pairs?.find((p) => p.symbol === symbol);
        if (match?.price && match.price > 0 && !cancelled) {
          setPrice(match.price);
        }
      } catch {
        /* keep last price */
      }
    }

    void fetchPrice();
    const id = window.setInterval(fetchPrice, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [symbol]);

  return price;
}
