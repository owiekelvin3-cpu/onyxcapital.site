"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { CopyTraderProfile } from "@/lib/copy-traders";
import {
  traderPerformanceSeries,
  traderRiskLevel,
  traderSpecialtyKeys,
  traderTradeCount,
} from "@/lib/copy-traders";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { HelpCircle, LineChart, Loader2, TrendingUp, User, Users } from "@/components/icons";
import { TraderAvatar } from "./TraderAvatar";

function PerformanceSparkline({ values }: { values: number[] }) {
  const width = 280;
  const height = 72;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / span) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full" role="img" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke="var(--brand-accent)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CopyTraderCard({
  trader,
  index,
  isActive,
  userId,
  loading,
  canAfford,
  onCopy,
  onUncopy,
}: {
  trader: CopyTraderProfile;
  index: number;
  isActive: boolean;
  userId: string | null;
  loading: boolean;
  canAfford: boolean;
  onCopy: () => void;
  onUncopy: () => void;
}) {
  const { t } = useTranslation();
  const [showPerformance, setShowPerformance] = useState(false);
  const specialties = traderSpecialtyKeys(trader.sectionId)
    .map((key) => t(`copyTrading.markets.${key}`))
    .join(", ");
  const roi = Number.isFinite(trader.roi) ? trader.roi : 0;
  const winRate = Number.isFinite(trader.winRate) ? trader.winRate : 0;
  const followers = Number.isFinite(trader.followers) ? trader.followers : 0;
  const trades = traderTradeCount({ ...trader, followers });
  const risk = traderRiskLevel({ ...trader, roi, winRate });
  const showInsufficient = Boolean(userId) && !isActive && !canAfford;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col overflow-hidden rounded-[1.5rem] border border-border bg-[#111111] p-5 text-white shadow-[0_12px_40px_rgba(0,0,0,0.28)] dark:bg-[#141414]"
    >
      <div className="flex items-start gap-3">
        <TraderAvatar trader={trader} size="lg" />
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[17px] font-semibold tracking-tight">{trader.name}</h3>
            {trader.verified && (
              <span
                className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#e2ff4c] text-[10px] font-black text-[#111111]"
                title="Verified trader"
              >
                ✓
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-white/45">{specialties}</p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-white/55">{trader.bio}</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[#16351f] px-3 py-3">
          <p className="text-[11px] text-white/50">{t("copyTrading.monthlyReturn")}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-[#34d399]">
            {formatPercent(roi)}
          </p>
        </div>
        <div className="rounded-xl bg-[#1f2410] px-3 py-3">
          <p className="text-[11px] text-white/50">{t("copyTrading.winRate")}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-[#e2ff4c]">
            {winRate.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-[#1c1c1c] px-2 py-3 text-center">
          <User className="mx-auto h-3.5 w-3.5 text-white/40" />
          <p className="mt-1.5 text-[10px] text-white/40">{t("copyTrading.followers")}</p>
          <p className="mt-0.5 text-[12px] font-semibold tabular-nums">{followers.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-[#1c1c1c] px-2 py-3 text-center">
          <Users className="mx-auto h-3.5 w-3.5 text-white/40" />
          <p className="mt-1.5 text-[10px] text-white/40">{t("copyTrading.trades")}</p>
          <p className="mt-0.5 text-[12px] font-semibold tabular-nums">{trades.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-[#1c1c1c] px-2 py-3 text-center">
          <TrendingUp className="mx-auto h-3.5 w-3.5 text-white/40" />
          <p className="mt-1.5 text-[10px] text-white/40">{t("copyTrading.riskShort")}</p>
          <p
            className={cn(
              "mt-0.5 text-[12px] font-semibold",
              risk === "low" && "text-[#34d399]",
              risk === "medium" && "text-[#e2ff4c]",
              risk === "high" && "text-[#f87171]"
            )}
          >
            {t(`copyTrading.riskLevel.${risk}`)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#1c1c1c] px-3 py-2.5">
        <div>
          <p className="text-[11px] text-white/40">{t("copyTrading.copyPrice")}</p>
          <p className="text-[15px] font-semibold tabular-nums">{formatCurrency(trader.price)}</p>
        </div>
        {showInsufficient && (
          <p className="flex max-w-[58%] items-start gap-1 text-right text-[11px] leading-snug text-[#f87171]">
            <HelpCircle className="mt-0.5 h-3 w-3 shrink-0" />
            {t("copyTrading.insufficientToCopy")}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {isActive ? (
          <Button
            type="button"
            className="h-11 w-full rounded-xl"
            variant="outline"
            disabled={loading}
            onClick={onUncopy}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("copyTrading.uncopy")}
          </Button>
        ) : userId ? (
          showInsufficient ? (
            <Link href="/dashboard/deposit" className="block">
              <button
                type="button"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#e2ff4c] text-sm font-semibold text-[#111111] opacity-55"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                {t("copyTrading.insufficientCta")}
              </button>
            </Link>
          ) : (
            <Button
              type="button"
              className="h-11 w-full rounded-xl bg-[#e2ff4c] text-[#111111] hover:bg-[#d4f23d]"
              disabled={loading}
              onClick={onCopy}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("copyTrading.copy")}
            </Button>
          )
        ) : (
          <Link href="/register" className="block">
            <Button className="h-11 w-full rounded-xl bg-[#e2ff4c] text-[#111111] hover:bg-[#d4f23d]">
              {t("copyTrading.copy")}
            </Button>
          </Link>
        )}

        <button
          type="button"
          onClick={() => setShowPerformance((open) => !open)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0a0a0a] text-sm font-medium text-white/80"
        >
          <LineChart className="h-3.5 w-3.5" />
          {showPerformance ? t("copyTrading.hidePerformance") : t("copyTrading.viewPerformance")}
        </button>
      </div>

      {showPerformance && (
        <div className="mt-3 rounded-xl bg-[#1c1c1c] px-3 py-3">
          <p className="text-[11px] text-white/40">{t("copyTrading.sampleLabel")}</p>
          <PerformanceSparkline values={traderPerformanceSeries(trader)} />
          <p className="text-[11px] text-white/35">{t("copyTrading.sampleHint")}</p>
        </div>
      )}
    </motion.article>
  );
}
