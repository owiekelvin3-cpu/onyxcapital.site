"use client";

import Link from "next/link";
import type { MemeCoinRow } from "@/lib/meme-coins/types";
import { MemeCoinLiveGrid } from "@/components/meme-coins/MemeCoinLiveGrid";
import { useLiveMemeCoins } from "@/hooks/useLiveMemeCoins";
import { cn } from "@/lib/utils";

export function MemeCoinDailyFeed({
  coins,
  listDate,
  recentDates,
}: {
  coins: MemeCoinRow[];
  listDate: string;
  recentDates: string[];
}) {
  const visibleCoins = coins.filter((c) => c.source !== "admin_manual");
  const liveCoins = useLiveMemeCoins(visibleCoins, { pollMs: 8_000, tickMs: 1_500 });

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-brand/20 bg-brand/5 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-text-primary">Trade meme coins in your dashboard</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Buy and hold today&apos;s live meme picks — instant settlement from your main USD balance.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard/meme-coins"
            className="fin-btn-primary inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold"
          >
            Open meme wallet
          </Link>
          <Link
            href="/register"
            className="inline-flex h-11 items-center rounded-full border border-border px-6 text-sm font-semibold text-text-primary hover:bg-bg-hover"
          >
            Create account
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "Live coins today", value: visibleCoins.length },
          { label: "Market status", value: "Updating live" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              {item.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm leading-relaxed text-text-secondary">
        <strong className="text-text-primary">High risk disclosure:</strong> Meme coins are extremely
        volatile and may lose most or all value. This is not financial advice. Only trade with funds
        you can afford to lose.
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary sm:text-xl">Live meme coin market</h2>
            <p className="text-sm text-text-secondary">
              Real-time prices for{" "}
              {new Date(`${listDate}T12:00:00Z`).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              {" · "}
              <span className="inline-flex items-center gap-1 text-green">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green" />
                </span>
                Live
              </span>
            </p>
          </div>
          {recentDates.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {recentDates.slice(0, 5).map((date) => (
                <Link
                  key={date}
                  href={date === listDate ? "/meme-coins" : `/meme-coins?date=${date}`}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    date === listDate
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border text-text-secondary hover:border-brand/30"
                  )}
                >
                  {date}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <MemeCoinLiveGrid coins={liveCoins} />
      </section>
    </div>
  );
}
