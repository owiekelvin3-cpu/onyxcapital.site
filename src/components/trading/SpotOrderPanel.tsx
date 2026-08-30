"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2 } from "@/components/icons";
import { spotAssetByPair } from "@/lib/spot-assets";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

type SpotOrderPanelProps = {
  symbol: string;
  side: "buy" | "sell";
  onSideChange: (side: "buy" | "sell") => void;
  amount: string;
  onAmountChange: (value: string) => void;
  total: number;
  price: number;
  cashBalance: number | null;
  heldQuantity: number;
  userId: string | null;
  loading: boolean;
  error: string;
  success: string;
  onSubmit: () => void;
  onDeposit?: () => void;
};

export function SpotOrderPanel({
  symbol,
  side,
  onSideChange,
  amount,
  onAmountChange,
  total,
  price,
  cashBalance,
  heldQuantity,
  userId,
  loading,
  error,
  success,
  onSubmit,
  onDeposit,
}: SpotOrderPanelProps) {
  const base = symbol.split("/")[0];
  const asset = spotAssetByPair(symbol);
  const qty = amount ? parseFloat(amount) : 0;
  const maxBuyQty = price > 0 && cashBalance !== null ? cashBalance / price : 0;
  const maxSellQty = heldQuantity;

  function setMax(fraction: number) {
    if (side === "buy") {
      const max = maxBuyQty * fraction;
      onAmountChange(max > 0 ? max.toFixed(max < 1 ? 6 : 4) : "");
      return;
    }
    const max = maxSellQty * fraction;
    onAmountChange(max > 0 ? max.toFixed(max < 1 ? 6 : 4) : "");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex mb-4">
        <button
          type="button"
          onClick={() => onSideChange("buy")}
          className={cn(
            "flex-1 h-10 text-sm font-semibold rounded-l cursor-pointer touch-target transition-colors",
            side === "buy"
              ? "bg-green text-white"
              : "bg-bg-primary text-text-tertiary border border-border"
          )}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => onSideChange("sell")}
          className={cn(
            "flex-1 h-10 text-sm font-semibold rounded-r cursor-pointer touch-target transition-colors",
            side === "sell"
              ? "bg-red text-white"
              : "bg-bg-primary text-text-tertiary border border-border"
          )}
        >
          Sell
        </button>
      </div>

      {userId && (
        <div className="mb-3 space-y-1 rounded-xl border border-border bg-bg-primary/60 px-3 py-2.5 text-[12px]">
          <div className="flex justify-between gap-2">
            <span className="text-text-tertiary">Cash available</span>
            <span className="font-mono text-text-secondary">
              {cashBalance === null ? "—" : formatCurrency(cashBalance)}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-text-tertiary">{base} in wallet</span>
            <span className="font-mono text-text-secondary">
              {formatNumber(heldQuantity, heldQuantity < 1 ? 6 : 4)} {base}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3 flex-1">
        <Input
          id="amount"
          label={`Amount (${base})`}
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
        />

        <div className="flex gap-2">
          {[0.25, 0.5, 1].map((fraction) => (
            <button
              key={fraction}
              type="button"
              onClick={() => setMax(fraction)}
              className="flex-1 min-h-10 rounded-lg border border-border bg-bg-primary px-2 py-2 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover touch-target sm:min-h-0 sm:py-1.5"
            >
              {fraction === 1 ? "Max" : `${fraction * 100}%`}
            </button>
          ))}
        </div>

        <div className="flex justify-between text-[12px]">
          <span className="text-text-tertiary">Price</span>
          <span className="font-mono">${formatNumber(price, price < 10 ? 4 : 2)}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-text-tertiary">{side === "buy" ? "Total cost" : "You receive"}</span>
          <span className="font-mono">{formatCurrency(total)}</span>
        </div>

        {error && (
          <p role="alert" className="text-[12px] text-red">
            {error}
          </p>
        )}
        {success && <p className="text-[12px] text-green">{success}</p>}

        <Button
          type="button"
          onClick={onSubmit}
          disabled={loading || !qty}
          className={cn(
            "w-full touch-target",
            side === "sell" ? "!bg-red !text-white" : "!bg-green !text-white"
          )}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </span>
          ) : (
            `${side === "buy" ? "Buy" : "Sell"} ${base}`
          )}
        </Button>

        {asset && onDeposit && (
          <button
            type="button"
            onClick={onDeposit}
            className="block w-full text-center text-xs font-semibold text-brand hover:text-brand-hover"
          >
            Deposit {asset.name} instead
          </button>
        )}
      </div>
    </div>
  );
}
