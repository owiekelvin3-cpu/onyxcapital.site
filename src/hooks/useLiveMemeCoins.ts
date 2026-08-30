"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MemeCoinRow } from "@/lib/meme-coins/types";
import {
  computeLiveMemePrice,
  mergeLiveMemeCoin,
} from "@/lib/meme-coins/live-prices";

export type LiveMemeCoin = MemeCoinRow & {
  livePriceUsd: number;
  priceDirection: "up" | "down" | "flat";
};

type PriceSnapshot = {
  id: string;
  price_usd: number | null;
  change_24h: number | null;
  updated_at: string;
  admin_price_locked?: boolean;
};

function anchorMs(coin: MemeCoinRow): number {
  const parsed = Date.parse(coin.updated_at);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function applyLivePrices(coins: MemeCoinRow[], nowMs: number, prevPrices: Map<string, number>): LiveMemeCoin[] {
  return coins.map((coin) => {
    const livePriceUsd = computeLiveMemePrice(coin, anchorMs(coin), nowMs);
    const prev = prevPrices.get(coin.id) ?? livePriceUsd;
    const delta = livePriceUsd - prev;
    const priceDirection: LiveMemeCoin["priceDirection"] =
      Math.abs(delta) < livePriceUsd * 0.00001 ? "flat" : delta > 0 ? "up" : "down";

    return {
      ...mergeLiveMemeCoin(coin, livePriceUsd, anchorMs(coin)),
      livePriceUsd,
      priceDirection,
    };
  });
}

export function useLiveMemeCoins(initialCoins: MemeCoinRow[], options?: { pollMs?: number; tickMs?: number }) {
  const pollMs = options?.pollMs ?? 8_000;
  const tickMs = options?.tickMs ?? 1_500;

  const [baseCoins, setBaseCoins] = useState(initialCoins);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const prevPricesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setBaseCoins(initialCoins);
  }, [initialCoins]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/meme-coins?live=1", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { coins?: MemeCoinRow[] };
        if (!cancelled && data.coins?.length) {
          setBaseCoins(data.coins);
        }
      } catch {
        /* keep last snapshot */
      }
    }

    poll();
    const id = window.setInterval(poll, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollMs]);

  const liveCoins = useMemo(() => {
    const next = applyLivePrices(baseCoins, nowMs, prevPricesRef.current);
    const map = new Map<string, number>();
    for (const coin of next) map.set(coin.id, coin.livePriceUsd);
    prevPricesRef.current = map;
    return next;
  }, [baseCoins, nowMs]);

  return liveCoins;
}

export function liveMemeCoinFromRow(coin: MemeCoinRow, nowMs = Date.now()): LiveMemeCoin {
  const livePriceUsd = computeLiveMemePrice(coin, anchorMs(coin), nowMs);
  return {
    ...mergeLiveMemeCoin(coin, livePriceUsd, anchorMs(coin)),
    livePriceUsd,
    priceDirection: "flat",
  };
}

import type { MemeHoldingRow } from "@/lib/api/meme-trading";

export function buildWalletFromLiveCoins(
  bagItems: Array<{
    holding: MemeHoldingRow;
    coin: MemeCoinRow;
  }>,
  liveCoins: LiveMemeCoin[]
) {
  const byId = new Map(liveCoins.map((c) => [c.id, c]));

  return bagItems.map((item) => {
    const coin = byId.get(item.coin.id) ?? liveMemeCoinFromRow(item.coin);
    const quantity = Number(item.holding.quantity);
    const priceUsd = coin.livePriceUsd;
    const valueUsd = quantity * priceUsd;
    const costBasis = quantity * Number(item.holding.avg_cost_usd ?? priceUsd);
    const unrealizedPnl = valueUsd - costBasis;
    const unrealizedPnlPct = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

    return {
      ...item,
      coin,
      priceUsd,
      valueUsd,
      costBasis,
      unrealizedPnl,
      unrealizedPnlPct,
      change24h: coin.change_24h,
    };
  });
}

export type { PriceSnapshot };
