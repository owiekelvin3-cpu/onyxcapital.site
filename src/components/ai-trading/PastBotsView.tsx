"use client";

import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/utils";
import type { AISubscription } from "./types";

interface PastBotsViewProps {
  completedSubs: AISubscription[];
}

export function PastBotsView({ completedSubs }: PastBotsViewProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-border bg-bg-secondary/25 p-5 animate-in fade-in duration-300">
      <h2 className="text-lg font-semibold text-text-primary">{t("aiTrading.historyTitle")}</h2>
      <p className="mt-1 text-sm text-text-tertiary">{t("aiTrading.historyDesc")}</p>

      {completedSubs.length === 0 ? (
        <p className="mt-10 text-center text-sm text-text-tertiary">{t("aiTrading.noHistory")}</p>
      ) : (
        <div className="mt-4 space-y-2.5">
          {completedSubs.map((s) => {
            const profit = Number(s.profit_earned ?? 0);
            const positive = profit >= 0;
            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-border bg-bg-tertiary/40 px-4 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-text-primary">{s.bot_name}</p>
                  <p className="text-xs text-text-tertiary">
                    {formatCurrency(s.allocation)} · {s.crypto_asset} · {s.duration_hours}h
                  </p>
                </div>
                <p className={`shrink-0 font-semibold ${positive ? "text-green" : "text-red"}`}>
                  {positive ? "+" : ""}
                  {formatCurrency(profit)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
