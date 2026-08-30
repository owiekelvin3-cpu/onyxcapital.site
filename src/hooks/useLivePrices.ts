"use client";

import { useEffect, useState } from "react";
import type { MarketPair } from "@/lib/market-data";
import { MARKET_PAIRS } from "@/lib/market-data";

export function useLivePrices() {
  const [pairs, setPairs] = useState<MarketPair[]>(MARKET_PAIRS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/prices")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.pairs?.length) {
          setPairs(data.pairs);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { pairs, loading };
}
