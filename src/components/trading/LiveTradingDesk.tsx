"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  LineChart,
  Loader2,
  Shield,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LivePriceChart } from "@/components/trading/LivePriceChart";
import { CryptoIcon } from "@/components/crypto/CryptoIcon";
import { createClient } from "@/lib/supabase/client";
import {
  executeTrade,
  getHoldings,
  getRecentTrades,
  getUsdBalance,
} from "@/lib/api/trading";
import { MARKET_PAIRS, type MarketPair } from "@/lib/market-data";
import { useLiveMarketPairs } from "@/hooks/useLiveMarketPairs";
import { emitDashboardRefresh } from "@/lib/dashboard-live-sync";
import type { HoldingRow, TradeRow } from "@/lib/supabase/types";
import { cn, formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

const CATEGORIES = ["crypto", "stock", "forex"] as const;
const LEVERAGE_OPTIONS = [1, 2, 5, 10, 20, 50] as const;
const DURATIONS = ["1m", "5m", "15m", "1h", "4h"] as const;
const LOW_BALANCE = 1;

type Category = (typeof CATEGORIES)[number];
type OrderKind = "market" | "limit";
type TradeMode = "spot" | "timed";
type PositionsTab = "open" | "history";

function baseAsset(symbol: string) {
  return symbol.split("/")[0];
}

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-3 py-1 text-sm text-text-primary"
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          on ? "bg-brand" : "bg-bg-tertiary"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            on ? "left-5" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="grid grid-cols-2 rounded-xl border border-border bg-bg-tertiary p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "h-9 rounded-lg text-xs font-semibold transition-colors",
            value === option.id
              ? "bg-brand text-brand-text shadow-sm"
              : "text-text-tertiary hover:text-text-primary"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function LiveTradingDesk() {
  const { t } = useTranslation();
  const pairs = useLiveMarketPairs(MARKET_PAIRS, 15_000);
  const [category, setCategory] = useState<Category>("crypto");
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [orderKind, setOrderKind] = useState<OrderKind>("limit");
  const [mode, setMode] = useState<TradeMode>("spot");
  const [amountUsd, setAmountUsd] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [leverage, setLeverage] = useState(10);
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>("15m");
  const [stopLoss, setStopLoss] = useState(false);
  const [takeProfit, setTakeProfit] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [tab, setTab] = useState<PositionsTab>("open");
  const [busy, setBusy] = useState<"buy" | "sell" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [closingAsset, setClosingAsset] = useState<string | null>(null);

  const filtered = useMemo(
    () => pairs.filter((p) => p.category === category),
    [pairs, category]
  );
  const pair = filtered.find((p) => p.symbol === symbol) ?? filtered[0] ?? pairs[0];

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("pair");
    if (!raw) return;
    const upper = raw.toUpperCase();
    const match =
      MARKET_PAIRS.find((p) => p.symbol.toUpperCase() === upper) ??
      MARKET_PAIRS.find((p) => p.symbol.split("/")[0].toUpperCase() === upper);
    if (!match) return;
    setCategory(match.category);
    setSymbol(match.symbol);
  }, []);

  useEffect(() => {
    if (pair && pair.symbol !== symbol) setSymbol(pair.symbol);
  }, [pair, symbol]);

  useEffect(() => {
    if (pair?.price && orderKind === "limit" && !limitPrice) {
      setLimitPrice(String(pair.price));
    }
  }, [pair?.price, orderKind, limitPrice]);

  const loadAccount = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const [cash, held, recent] = await Promise.all([
      getUsdBalance(supabase, user.id),
      getHoldings(supabase, user.id),
      getRecentTrades(supabase, user.id, 40),
    ]);
    setBalance(cash);
    setHoldings(held);
    setTrades(recent);
  }, []);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const mark = pair?.price ?? 0;
  const fillPrice = orderKind === "limit" ? Number(limitPrice) || mark : mark;
  const usd = Number(amountUsd) || 0;
  const effectiveLeverage = mode === "timed" ? leverage : 1;
  const positionSize = usd * (mode === "timed" ? effectiveLeverage : 1);
  const marginRequired = effectiveLeverage > 1 ? usd / effectiveLeverage : usd;
  const qty = fillPrice > 0 ? usd / fillPrice : 0;
  const base = pair ? baseAsset(pair.symbol) : "";
  const heldQty = holdings.find((h) => h.asset === base)?.quantity ?? 0;
  const lowBalance = balance < LOW_BALANCE;

  const slPrice = stopLoss ? fillPrice * (pair && pair.change24h < 0 ? 0.97 : 0.98) : null;
  const tpPrice = takeProfit ? fillPrice * 1.04 : null;

  function setPercent(fraction: number) {
    setAmountUsd(balance > 0 ? (balance * fraction).toFixed(2) : "");
  }

  async function submit(side: "buy" | "sell") {
    setError("");
    setSuccess("");
    if (!userId || !pair) return;
    if (!usd || usd <= 0 || !qty) {
      setError(t("trading.needAmount"));
      return;
    }
    if (fillPrice <= 0) {
      setError(t("trading.priceUnavailable"));
      return;
    }
    if (orderKind === "limit") {
      if (side === "buy" && fillPrice < mark) {
        setError(t("trading.limitAway"));
        return;
      }
      if (side === "sell" && fillPrice > mark) {
        setError(t("trading.limitAway"));
        return;
      }
    }
    if (side === "buy" && usd > balance + 0.009) {
      setError(t("trading.insufficientBalance"));
      return;
    }
    const sellQty = Math.min(qty, heldQty);
    if (side === "sell" && sellQty <= 0) {
      setError(t("trading.insufficientHoldings"));
      return;
    }

    setBusy(side);
    try {
      const supabase = createClient();
      await executeTrade(supabase, {
        userId,
        asset: pair.symbol,
        type: side,
        amount: side === "sell" ? sellQty : qty,
        price: fillPrice,
      });
      setSuccess(
        side === "buy"
          ? t("trading.orderFilledBuy", {
              qty: formatNumber(qty, qty < 1 ? 6 : 4),
              pair: pair.symbol,
              amount: formatCurrency(usd),
            })
          : t("trading.orderFilledSell", {
              qty: formatNumber(sellQty, sellQty < 1 ? 6 : 4),
              pair: pair.symbol,
              amount: formatCurrency(sellQty * fillPrice),
            })
      );
      setAmountUsd("");
      emitDashboardRefresh();
      await loadAccount();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("trading.insufficientBalance");
      if (/insufficient balance/i.test(message)) setError(t("trading.insufficientBalance"));
      else if (/insufficient holdings/i.test(message)) setError(t("trading.insufficientHoldings"));
      else setError(message);
    } finally {
      setBusy(null);
    }
  }

  async function closeHolding(holding: HoldingRow) {
    if (!userId) return;
    const match = pairs.find((p) => baseAsset(p.symbol) === holding.asset);
    const live = match?.price ?? 0;
    if (live <= 0 || holding.quantity <= 0) return;
    setClosingAsset(holding.asset);
    setError("");
    try {
      const supabase = createClient();
      await executeTrade(supabase, {
        userId,
        asset: match?.symbol ?? holding.asset,
        type: "sell",
        amount: Number(holding.quantity),
        price: live,
      });
      emitDashboardRefresh();
      await loadAccount();
      setTab("history");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("trading.insufficientHoldings"));
    } finally {
      setClosingAsset(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-brand" />
            <h1 className="text-2xl font-bold text-text-primary">{t("trading.title")}</h1>
          </div>
          <p className="mt-1 text-sm text-text-secondary">{t("trading.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-bg-secondary px-3 py-2">
          <Wallet className="h-4 w-4 text-text-tertiary" />
          <div>
            <p className="text-[10px] uppercase tracking-wide text-text-tertiary">
              {t("trading.tradingBalance")}
            </p>
            <p className="text-sm font-bold tabular-nums text-text-primary">{formatCurrency(balance)}</p>
          </div>
        </div>
      </div>

      {lowBalance && (
        <div className="flex flex-col gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm text-text-primary">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            {t("trading.lowBalanceBanner")}
          </p>
          <Link href="/dashboard/deposit" className="shrink-0">
            <Button size="sm">{t("dashboard.navDeposit")}</Button>
          </Link>
        </div>
      )}

      <div className="relative flex flex-col gap-2 rounded-2xl border border-border bg-bg-secondary p-2 sm:flex-row sm:items-center">
        <div className="flex gap-1 overflow-x-auto">
          {CATEGORIES.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className={cn(
                "h-10 shrink-0 rounded-xl px-3 text-xs font-semibold uppercase",
                category === id ? "bg-brand text-brand-text" : "text-text-tertiary hover:bg-bg-hover"
              )}
            >
              {t(`trading.category.${id}`)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen((open) => !open)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border border-border bg-bg-primary px-3 py-2 text-left"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-text-primary">
              {pair?.symbol} {pair?.name}
            </span>
            <span className="text-xs text-text-tertiary">
              ${formatNumber(mark, mark < 10 ? 4 : 2)}{" "}
              <span className={pair && pair.change24h >= 0 ? "text-green" : "text-red"}>
                {pair ? formatPercent(pair.change24h) : ""}
              </span>
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-text-tertiary" />
        </button>
        {pair && (
          <span
            className={cn(
              "inline-flex h-10 shrink-0 items-center rounded-full px-3 text-xs font-bold",
              pair.change24h >= 0 ? "bg-green/15 text-green" : "bg-red/15 text-red"
            )}
          >
            {formatPercent(pair.change24h)} · {t("trading.live")}
          </span>
        )}
        {pickerOpen && (
          <div className="absolute left-2 right-2 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-border bg-bg-secondary p-1 shadow-[var(--shadow-card)]">
            {filtered.map((item) => (
              <button
                key={item.symbol}
                type="button"
                onClick={() => {
                  setSymbol(item.symbol);
                  setLimitPrice(String(item.price));
                  setPickerOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm",
                  item.symbol === pair?.symbol ? "bg-bg-hover" : "hover:bg-bg-hover"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {item.category === "crypto" && (
                    <CryptoIcon symbol={baseAsset(item.symbol)} label={item.name} size="sm" tile={false} />
                  )}
                  <span className="truncate font-medium">
                    {item.symbol} · {item.name}
                  </span>
                </span>
                <span className="shrink-0 text-right font-mono text-xs">
                  ${formatNumber(item.price, item.price < 10 ? 4 : 2)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        {pair && <LivePriceChart pair={pair} />}

        <Card className="flex flex-col p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-text-primary">
                <Shield className="h-4 w-4 text-brand" />
                {t("trading.tradePair", { pair: pair?.symbol ?? "" })}
              </h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {t("trading.balance")}: {formatCurrency(balance)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Segmented
              value={orderKind}
              onChange={setOrderKind}
              options={[
                { id: "market", label: t("trading.marketOrder") },
                { id: "limit", label: t("trading.limitOrder") },
              ]}
            />
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { id: "spot", label: t("trading.spotTrade") },
                { id: "timed", label: t("trading.timedTrade") },
              ]}
            />

            {orderKind === "limit" && (
              <Input
                label={t("trading.limitPrice")}
                type="number"
                min={0}
                step="any"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
              />
            )}

            <div>
              <div className="mb-1 flex justify-between text-[11px] text-text-tertiary">
                <span>{t("trading.amountUsd")}</span>
                <span>
                  {t("trading.max")}: {formatCurrency(balance)}
                </span>
              </div>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={amountUsd}
                onChange={(e) => setAmountUsd(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[0.25, 0.5, 0.75, 1].map((fraction) => (
                <button
                  key={fraction}
                  type="button"
                  onClick={() => setPercent(fraction)}
                  className="h-9 rounded-xl border border-border bg-bg-primary text-xs font-semibold text-text-secondary hover:border-brand/40 hover:text-text-primary"
                >
                  {fraction * 100}%
                </button>
              ))}
            </div>

            <div className="flex justify-between rounded-xl border border-border bg-bg-primary/60 px-3 py-2 text-xs">
              <span className="text-text-tertiary">
                {t("trading.amountAsset", { asset: base || "—" })}
              </span>
              <span className="font-mono tabular-nums">{qty ? formatNumber(qty, qty < 1 ? 6 : 4) : "0.00000000"}</span>
            </div>

            {mode === "timed" && (
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1.5">
                  <span className="block text-xs text-text-tertiary">{t("trading.leverage")}</span>
                  <select
                    value={leverage}
                    onChange={(e) => setLeverage(Number(e.target.value))}
                    className="h-10 w-full rounded border border-border bg-bg-primary px-3 text-sm text-text-primary"
                  >
                    {LEVERAGE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}x
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="block text-xs text-text-tertiary">{t("trading.duration")}</span>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value as (typeof DURATIONS)[number])}
                    className="h-10 w-full rounded border border-border bg-bg-primary px-3 text-sm text-text-primary"
                  >
                    {DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="space-y-1 rounded-xl border border-border px-3 py-2">
              <Toggle on={stopLoss} onChange={setStopLoss} label={t("trading.stopLoss")} />
              <Toggle on={takeProfit} onChange={setTakeProfit} label={t("trading.takeProfit")} />
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl bg-bg-tertiary px-3 py-3 text-xs">
              <div>
                <p className="text-text-tertiary">{t("trading.marginRequired")}</p>
                <p className="mt-0.5 font-semibold tabular-nums">{formatCurrency(marginRequired)}</p>
              </div>
              <div>
                <p className="text-text-tertiary">{t("trading.positionSize")}</p>
                <p className="mt-0.5 font-semibold tabular-nums">{formatCurrency(positionSize)}</p>
              </div>
              {slPrice && (
                <div>
                  <p className="text-text-tertiary">{t("trading.stopLoss")}</p>
                  <p className="mt-0.5 font-semibold tabular-nums text-red">${formatNumber(slPrice, 2)}</p>
                </div>
              )}
              {tpPrice && (
                <div>
                  <p className="text-text-tertiary">{t("trading.takeProfit")}</p>
                  <p className="mt-0.5 font-semibold tabular-nums text-green">${formatNumber(tpPrice, 2)}</p>
                </div>
              )}
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-red/20 bg-red/5 px-3 py-2 text-xs text-red">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-xl border border-green/20 bg-green/5 px-3 py-2 text-xs text-green">{success}</p>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                className="!bg-green !text-white"
                disabled={busy !== null || !usd}
                onClick={() => void submit("buy")}
              >
                {busy === "buy" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    {t("trading.buyLong")}
                  </>
                )}
              </Button>
              <Button
                type="button"
                className="!bg-red !text-white"
                disabled={busy !== null || !usd}
                onClick={() => void submit("sell")}
              >
                {busy === "sell" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4" />
                    {t("trading.sellShort")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-text-primary">
            <Clock className="h-4 w-4 text-brand" />
            {t("trading.positionsTitle")}
          </h2>
          <div className="flex rounded-xl border border-border bg-bg-tertiary p-1">
            {(
              [
                ["open", `${t("trading.openTab")} (${holdings.length})`],
                ["history", `${t("trading.historyTab")} (${trades.length})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "h-8 rounded-lg px-3 text-xs font-semibold",
                  tab === id ? "bg-bg-secondary text-text-primary shadow-sm" : "text-text-tertiary"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === "open" ? (
          holdings.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center text-sm text-text-tertiary">
              <LineChart className="mb-3 h-8 w-8 opacity-40" />
              {t("trading.noOpenPositions")}
            </div>
          ) : (
            <div className="space-y-2">
              {holdings.map((holding) => {
                const live =
                  pairs.find((p) => baseAsset(p.symbol) === holding.asset)?.price ?? 0;
                const value = Number(holding.quantity) * live;
                return (
                  <div
                    key={holding.id}
                    className="flex flex-col gap-2 rounded-xl border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-text-primary">{holding.asset}</p>
                      <p className="text-xs text-text-tertiary">
                        {formatNumber(Number(holding.quantity), Number(holding.quantity) < 1 ? 6 : 4)} ·{" "}
                        {t("trading.mark")} ${formatNumber(live, live < 10 ? 4 : 2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(value)}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={closingAsset === holding.asset}
                        onClick={() => void closeHolding(holding)}
                      >
                        {closingAsset === holding.asset ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          t("trading.closePosition")
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : trades.length === 0 ? (
          <div className="py-10 text-center text-sm text-text-tertiary">{t("trading.noHistory")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-text-tertiary">
                <tr>
                  <th className="pb-2 pr-3 font-medium">{t("trading.asset")}</th>
                  <th className="pb-2 pr-3 font-medium">{t("trading.side")}</th>
                  <th className="pb-2 pr-3 font-medium">{t("trading.qty")}</th>
                  <th className="pb-2 pr-3 font-medium">{t("trading.entry")}</th>
                  <th className="pb-2 font-medium">{t("trading.status")}</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-t border-border">
                    <td className="py-2.5 pr-3 font-medium">{trade.asset}</td>
                    <td className={cn("py-2.5 pr-3 capitalize", trade.type === "buy" ? "text-green" : "text-red")}>
                      {trade.type}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {formatNumber(trade.amount, trade.amount < 1 ? 6 : 4)}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatCurrency(trade.price)}</td>
                    <td className="py-2.5 capitalize text-text-tertiary">{trade.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
