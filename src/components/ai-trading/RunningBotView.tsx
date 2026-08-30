"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bot, Clock, Zap } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { AiBotTradingAnimation } from "./AiBotTradingAnimation";
import {
  computeLiveProfit,
  computeMarketPnL,
  formatCountdown,
  getRunProgress,
} from "@/lib/ai-trading";
import { createClient } from "@/lib/supabase/client";
import { markAiBotMarketPnl } from "@/lib/api/ai-trading";
import { formatCurrency, cn } from "@/lib/utils";
import type { AISubscription } from "./types";

interface RunningBotViewProps {
  activeSubs: AISubscription[];
  selectedSub: AISubscription | null;
  onSelectSub: (id: string) => void;
  tick: number;
  onStartAnother: () => void;
}

export function RunningBotView({
  activeSubs,
  selectedSub,
  onSelectSub,
  tick,
  onStartAnother,
}: RunningBotViewProps) {
  const { t } = useTranslation();
  const [markPrice, setMarkPrice] = useState<number | null>(null);

  useEffect(() => {
    setMarkPrice(selectedSub?.last_mark_price ? Number(selectedSub.last_mark_price) : null);
  }, [selectedSub?.id, selectedSub?.last_mark_price]);

  useEffect(() => {
    if (!selectedSub?.id || !markPrice || markPrice <= 0) return;

    const supabase = createClient();
    const pushMark = () => {
      void markAiBotMarketPnl(supabase, selectedSub.id, markPrice).catch(() => {});
    };

    pushMark();
    const id = window.setInterval(pushMark, 8000);
    return () => window.clearInterval(id);
  }, [selectedSub?.id, markPrice]);

  if (activeSubs.length === 0 || !selectedSub) {
    return (
      <div className="rounded-2xl border border-border bg-bg-secondary/25 py-16 text-center animate-in fade-in duration-300">
        <Bot className="mx-auto h-12 w-12 text-text-tertiary" />
        <p className="mt-4 font-medium text-text-primary">{t("aiTrading.noActiveBots")}</p>
        <p className="mt-1 text-sm text-text-tertiary">{t("aiTrading.noActiveBotsDesc")}</p>
        <Button className="mt-6" onClick={onStartAnother}>
          {t("aiTrading.startNow")}
          <Zap className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  const earnings = computeLiveProfit(selectedSub, markPrice);
  const entry = Number(selectedSub.entry_price ?? 0);
  const marketMove =
    entry > 0 && markPrice && markPrice > 0
      ? computeMarketPnL(selectedSub.allocation, entry, markPrice)
      : null;
  const progress = getRunProgress(selectedSub);
  const earningsPositive = earnings >= 0;
  const movePct =
    entry > 0 && markPrice && markPrice > 0 ? ((markPrice - entry) / entry) * 100 : null;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {activeSubs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {activeSubs.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSub(s.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                selectedSub.id === s.id
                  ? "border-brand/40 bg-brand/10 text-brand"
                  : "border-border text-text-tertiary hover:text-text-primary"
              )}
            >
              {s.bot_name}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-[1.75rem] border border-brand/25 bg-gradient-to-br from-brand/10 via-brand/[0.04] to-transparent p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand">
              {t("aiTrading.botRunning")}
            </p>
            <h2 className="mt-1 text-xl font-bold text-text-primary sm:text-2xl">
              {selectedSub.bot_name}
            </h2>
            <p className="mt-1 text-xs text-text-tertiary">
              {selectedSub.crypto_asset} · {formatCurrency(selectedSub.allocation)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green/15 px-2.5 py-1 text-[11px] font-semibold text-green">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green" />
            </span>
            {t("aiTrading.running")}
          </span>
        </div>

        <AiBotTradingAnimation
          key={selectedSub.id}
          cryptoAsset={selectedSub.crypto_asset || "BTC"}
          botName={selectedSub.bot_name}
          onMarkPrice={setMarkPrice}
        />

        <div className="mt-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
            {t("aiTrading.earningsSoFar")}
          </p>
          <p
            className={cn(
              "mt-2 text-4xl font-bold sm:text-5xl transition-colors duration-300 tabular-nums",
              earningsPositive ? "text-green" : "text-red"
            )}
            key={`${tick}-${earnings}`}
          >
            {earningsPositive ? "+" : ""}
            {formatCurrency(earnings)}
          </p>
          {movePct != null && (
            <p
              className={cn(
                "mt-1 text-sm font-semibold tabular-nums",
                movePct >= 0 ? "text-green" : "text-red"
              )}
            >
              {selectedSub.crypto_asset} {movePct >= 0 ? "+" : ""}
              {movePct.toFixed(2)}%
              {marketMove != null && (
                <span className="ml-2 font-normal text-text-tertiary">
                  ({marketMove >= 0 ? "+" : ""}
                  {formatCurrency(marketMove)})
                </span>
              )}
            </p>
          )}
          <p className="mt-2 text-xs text-text-tertiary">{t("aiTrading.marketLinkedHint")}</p>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs text-text-tertiary">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {t("aiTrading.timeRemaining")}
            </span>
            <span className="font-mono font-semibold text-text-primary" key={`t-${tick}`}>
              {selectedSub.expires_at ? formatCountdown(selectedSub.expires_at) : "—"}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-bg-tertiary">
            <div
              className="h-full rounded-full bg-brand transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-text-tertiary">{t("aiTrading.moneyBackNote")}</p>
      </div>

      <Button variant="outline" className="w-full" onClick={onStartAnother}>
        {t("aiTrading.buyAnother")}
      </Button>
    </div>
  );
}
