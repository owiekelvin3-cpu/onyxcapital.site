"use client";

import { useEffect, useState } from "react";
import type { MarketPair } from "@/lib/market-data";

export function useLiveMarketPairs(initial: MarketPair[], intervalMs = 30_000) {
  const [pairs, setPairs] = useState(initial);

  useEffect(() => {
    setPairs(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch("/api/prices", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { pairs?: MarketPair[] };
        if (!cancelled && data.pairs?.length) setPairs(data.pairs);
      } catch {
        /* keep last good data */
      }
    }

    const id = window.setInterval(refresh, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [intervalMs]);

  return pairs;
}
