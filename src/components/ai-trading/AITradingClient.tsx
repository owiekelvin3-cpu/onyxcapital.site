"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Wallet, Zap } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { AI_BOTS, RECOMMENDED_BOT_ID, ASSET_SYMBOL_MAP, seedEntryPrice } from "@/lib/ai-bots";
import { computeLiveProfit } from "@/lib/ai-trading";
import {
  getAiSubscriptions,
  purchaseAiBot,
  syncUserAiBots,
} from "@/lib/api/ai-trading";
import { getUsdBalance } from "@/lib/api/trading";
import { formatCurrency, cn } from "@/lib/utils";
import { StartBotFlow } from "./StartBotFlow";
import { RunningBotView } from "./RunningBotView";
import { PastBotsView } from "./PastBotsView";
import type { AISubscription, AITradingView, StartStep } from "./types";

async function fetchEntryPrice(cryptoAsset: string): Promise<number> {
  const symbol = ASSET_SYMBOL_MAP[cryptoAsset] ?? `${cryptoAsset}/USDT`;
  try {
    const res = await fetch("/api/prices");
    if (!res.ok) return seedEntryPrice(cryptoAsset);
    const json = (await res.json()) as { pairs?: Array<{ symbol: string; price: number }> };
    const match = json.pairs?.find((p) => p.symbol === symbol);
    if (match?.price && match.price > 0) return match.price;
  } catch {
    /* fallback */
  }
  return seedEntryPrice(cryptoAsset);
}

export function AITradingClient() {
  const { t } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [subs, setSubs] = useState<AISubscription[]>([]);
  const [selectedBot, setSelectedBot] = useState(RECOMMENDED_BOT_ID);
  const [durationHours, setDurationHours] = useState(24);
  const [cryptoAsset, setCryptoAsset] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [startStep, setStartStep] = useState<StartStep>(1);
  const [view, setView] = useState<AITradingView>("start");
  const [viewReady, setViewReady] = useState(false);
  const [tick, setTick] = useState(0);

  const bot = AI_BOTS.find((b) => b.id === selectedBot)!;
  const amountNum = parseFloat(amount) || 0;

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);
    await syncUserAiBots(supabase).catch(() => {});

    const [bal, loaded] = await Promise.all([
      getUsdBalance(supabase, user.id),
      getAiSubscriptions(supabase, user.id),
    ]);

    setBalance(bal);
    setSubs(loaded);
    const firstActive = loaded.find((s) => s.status === "active");
    setSelectedSubId((prev) => {
      if (prev && loaded.some((s) => s.id === prev && s.status === "active")) return prev;
      return firstActive?.id ?? null;
    });
    if (!viewReady) {
      setView(firstActive ? "running" : "start");
      setViewReady(true);
    }
  }, [viewReady]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncTimer = window.setInterval(() => {
      void loadData();
    }, 10000);
    return () => window.clearInterval(syncTimer);
  }, [loadData]);

  const activeSubs = subs.filter((s) => s.status === "active");
  const completedSubs = subs.filter((s) => s.status === "completed");
  const selectedSub = activeSubs.find((s) => s.id === selectedSubId) ?? activeSubs[0] ?? null;
  const totalEarnings = activeSubs.reduce((sum, s) => sum + computeLiveProfit(s), 0);
  const minPower = bot.minPower;
  const needsFunds = balance < minPower;
  const isSuccessMsg =
    message.includes("+") || message.includes("!") || message.toLowerCase().includes("success");

  const goStart = () => {
    setView("start");
    setStartStep(1);
    setMessage("");
  };

  const handlePurchase = async () => {
    if (!userId) return;
    if (!amountNum || amountNum < minPower) {
      setMessage(t("aiTrading.minPower", { amount: formatCurrency(minPower) }));
      return;
    }
    if (amountNum > balance) {
      setMessage(t("aiTrading.insufficientBalance"));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const entryPrice = await fetchEntryPrice(cryptoAsset);
      const data = await purchaseAiBot(supabase, {
        userId,
        botId: bot.id,
        botName: bot.name,
        allocation: amountNum,
        durationHours,
        cryptoAsset,
        entryPrice,
      });

      setMessage(t("aiTrading.purchased"));
      setAmount("");
      if (data) setSelectedSubId(data.id);
      await loadData();
      setView("running");
      setStartStep(1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("aiTrading.insufficientBalance");
      setMessage(msg.includes("Insufficient") ? t("aiTrading.insufficientBalance") : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <span className="inline-flex items-center rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand">
          {t("aiTrading.badgeBeginner")}
        </span>
        <h1 className="mt-2 text-xl font-bold text-text-primary sm:text-2xl">
          {t("aiTrading.titleSimple")}
        </h1>
        <p className="mt-1 text-sm text-text-tertiary">{t("aiTrading.subtitleSimple")}</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-bg-secondary/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
              {t("aiTrading.yourBalance")}
            </p>
            <p className="text-2xl font-semibold text-text-primary">{formatCurrency(balance)}</p>
          </div>
          {needsFunds ? (
            <Link href="/dashboard/deposit" className="w-full sm:w-auto">
              <Button size="sm" className="w-full sm:w-auto">
                <Wallet className="h-4 w-4" />
                {t("aiTrading.addFundsFirst")}
              </Button>
            </Link>
          ) : activeSubs.length > 0 ? (
            <div className="sm:text-right">
              <p className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                {t("aiTrading.earningsSoFar")}
              </p>
              <p
                className={cn(
                  "text-xl font-semibold tabular-nums",
                  totalEarnings >= 0 ? "text-green" : "text-red"
                )}
                key={tick}
              >
                {totalEarnings >= 0 ? "+" : ""}
                {formatCurrency(totalEarnings)}
              </p>
            </div>
          ) : (
            <Button size="sm" onClick={goStart} className="w-full sm:w-auto">
              <Zap className="h-3.5 w-3.5" />
              {t("aiTrading.nav.start")}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-bg-secondary/30 p-1">
        <Button
          variant={view === "start" ? "secondary" : "ghost"}
          size="sm"
          onClick={goStart}
        >
          {t("aiTrading.nav.start")}
        </Button>
        <Button
          variant={view === "running" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => {
            setView("running");
            setMessage("");
          }}
          disabled={activeSubs.length === 0}
        >
          {t("aiTrading.nav.running")}
          {activeSubs.length > 0 && (
            <span className="ml-1 rounded-md bg-green/15 px-1.5 text-[10px] font-bold text-green">
              {activeSubs.length}
            </span>
          )}
        </Button>
        <Button
          variant={view === "past" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => {
            setView("past");
            setMessage("");
          }}
        >
          {t("aiTrading.nav.past")}
        </Button>
      </div>

      {message && (
        <p
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            isSuccessMsg
              ? "border-green/30 bg-green/10 text-green"
              : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300"
          )}
        >
          {message}
        </p>
      )}

      {view === "start" && (
        <StartBotFlow
          step={startStep}
          onStepChange={setStartStep}
          selectedBot={selectedBot}
          onSelectBot={setSelectedBot}
          durationHours={durationHours}
          onDurationChange={setDurationHours}
          cryptoAsset={cryptoAsset}
          onCryptoChange={setCryptoAsset}
          amount={amount}
          onAmountChange={setAmount}
          balance={balance}
          loading={loading}
          onStart={() => void handlePurchase()}
        />
      )}

      {view === "running" && (
        <RunningBotView
          activeSubs={activeSubs}
          selectedSub={selectedSub}
          onSelectSub={setSelectedSubId}
          tick={tick}
          onStartAnother={goStart}
        />
      )}

      {view === "past" && <PastBotsView completedSubs={completedSubs} />}
    </div>
  );
}
