"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn, formatNumber } from "@/lib/utils";
import { useAiMarketPrice } from "@/hooks/useAiMarketPrice";
import { CRYPTO_ASSETS } from "@/lib/ai-bots";

type TapeRow = {
  id: string;
  side: "buy" | "sell";
  price: number;
  size: string;
};

const STATUS_KEYS = [
  "aiTrading.liveStatusScanning",
  "aiTrading.liveStatusRouting",
  "aiTrading.liveStatusExecuting",
  "aiTrading.liveStatusMonitoring",
] as const;

export function AiBotTradingAnimation({
  cryptoAsset,
  botName,
  onMarkPrice,
}: {
  cryptoAsset: string;
  botName: string;
  onMarkPrice?: (price: number) => void;
}) {
  const { t } = useTranslation();
  const livePrice = useAiMarketPrice(cryptoAsset);
  const [tape, setTape] = useState<TapeRow[]>([]);
  const [phase, setPhase] = useState(0);

  const pairLabel =
    CRYPTO_ASSETS.find((c) => c.id === cryptoAsset)?.pair ?? `${cryptoAsset}/USDT`;

  useEffect(() => {
    onMarkPrice?.(livePrice);
  }, [livePrice, onMarkPrice]);

  useEffect(() => {
    const id = window.setInterval(() => setPhase((p) => (p + 1) % STATUS_KEYS.length), 3200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTape((prev) => {
        const side = Math.random() > 0.48 ? "buy" : "sell";
        const drift = livePrice * (Math.random() * 0.0008 - 0.0004);
        const row: TapeRow = {
          id: `${Date.now()}-${Math.random()}`,
          side,
          price: Math.max(0.0001, livePrice + drift),
          size: (Math.random() * 0.45 + 0.02).toFixed(4),
        };
        return [row, ...prev].slice(0, 6);
      });
    }, 1400);
    return () => window.clearInterval(id);
  }, [livePrice]);

  const statusText = t(STATUS_KEYS[phase]);

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-border/80 bg-bg-primary/80">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            {t("aiTrading.liveDeskSubtitle")}
          </p>
          <p className="text-sm font-semibold text-text-primary">{pairLabel}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg font-bold tabular-nums text-brand">
            ${formatNumber(livePrice, livePrice < 10 ? 4 : 2)}
          </p>
          <p className="text-[10px] text-text-tertiary">{botName}</p>
        </div>
      </div>

      <div className="relative h-32 overflow-hidden bg-[#0b0e11]">
        <div className="absolute inset-0 opacity-30 bg-[linear-gradient(rgba(240,185,11,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(240,185,11,0.06)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute inset-x-0 bottom-8 h-px bg-brand/40" />
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 40">
          <polyline
            fill="none"
            stroke="#f0b90b"
            strokeWidth="1.5"
            points="0,28 12,26 24,30 36,22 48,24 60,18 72,20 84,14 100,16"
          />
        </svg>
        <p className="absolute bottom-2 left-3 text-[10px] text-text-tertiary">{statusText}</p>
      </div>

      <div className="border-t border-border/60 px-3 py-2">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
          {t("aiTrading.liveTape")}
        </p>
        <div className="space-y-1 max-h-24 overflow-hidden">
          {tape.length === 0 ? (
            <p className="py-2 text-center text-[11px] text-text-tertiary">
              {t("aiTrading.liveTapeWaiting")}
            </p>
          ) : (
            tape.map((row) => (
              <div key={row.id} className="flex items-center justify-between font-mono text-[11px]">
                <span className={row.side === "buy" ? "text-green" : "text-red"}>
                  {row.side.toUpperCase()}
                </span>
                <span className="text-text-secondary tabular-nums">
                  ${formatNumber(row.price, row.price < 10 ? 4 : 2)}
                </span>
                <span className="text-text-tertiary">{row.size}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
