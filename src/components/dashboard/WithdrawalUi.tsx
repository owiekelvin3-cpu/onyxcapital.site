"use client";

import Link from "next/link";
import type { WithdrawalRow } from "@/lib/supabase/types";
import type { UserFeeRow } from "@/lib/api/fees";
import type { KycStatus } from "@/lib/kyc";
import {
  formatWithdrawalMethodLabel,
  formatWithdrawalDestination,
  withdrawalStatusTone,
  calculateWithdrawalFee,
  estimateReceiveAmount,
  getWithdrawalMethod,
  WITHDRAWAL_METHODS,
  type WithdrawalMethodId,
} from "@/lib/withdrawal-options";
import { CryptoIcon } from "@/components/crypto/CryptoIcon";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Wallet,
  BuildingColumns,
  MoneyBillTransfer,
  Mail,
  Clock,
  Shield,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  CircleCheck,
  Loader2,
  ChevronRight,
  Comments,
  CreditCard,
  Phone,
  Zap,
  FileCheck,
} from "@/components/icons";

const METHOD_ICONS: Record<WithdrawalMethodId, typeof Wallet> = {
  crypto: Wallet,
  bank_transfer: BuildingColumns,
  wire: MoneyBillTransfer,
  paypal: Mail,
  debit_card: CreditCard,
  mobile_money: Phone,
  instant_pay: Zap,
};

export function WithdrawalPageHeader() {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">Cash out</p>
      <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-1">Withdraw funds</h1>
      <p className="text-sm text-text-tertiary mt-1.5 max-w-xl leading-relaxed">
        Choose a payout method, enter your details, and submit for secure team review.
      </p>
    </div>
  );
}

export function WithdrawalBalanceBanner({
  balance,
  loading,
}: {
  balance: number | null;
  loading?: boolean;
}) {
  if (loading || balance === null) {
    return (
      <div className="rounded-2xl border border-border bg-bg-secondary p-5 animate-pulse">
        <div className="h-3 w-28 rounded bg-bg-hover" />
        <div className="h-8 w-40 rounded bg-bg-hover mt-3" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand/20 bg-gradient-to-br from-bg-secondary via-bg-secondary to-bg-primary p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand">
            <Wallet className="w-5 h-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Available balance
            </p>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-text-primary mt-0.5">
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        {balance > 0 ? (
          <p className="text-xs text-text-tertiary leading-relaxed max-w-xs sm:text-right">
            Withdrawals are reviewed for security. Most requests are processed within 24–48 hours.
          </p>
        ) : (
          <Link
            href="/dashboard/deposit"
            className="inline-flex items-center justify-center gap-2 h-8 px-4 text-xs rounded border border-border-light text-text-primary hover:border-text-tertiary hover:bg-bg-hover w-full sm:w-auto font-medium transition-all"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Add funds first
          </Link>
        )}
      </div>
    </div>
  );
}

export function WithdrawalBlockedBanner() {
  return (
    <div className="rounded-2xl border border-red/25 bg-red/5 p-4 flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red/10 text-red">
        <AlertTriangle className="w-4 h-4" />
      </span>
      <div>
        <p className="text-sm font-semibold text-text-primary">Withdrawals temporarily blocked</p>
        <p className="text-xs text-text-tertiary mt-1 leading-relaxed">
          You may have outstanding fees or portfolio requirements. Contact support if you need help.
        </p>
        <Link
          href="/dashboard/support"
          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-brand hover:text-brand-hover"
        >
          <Comments className="w-3.5 h-3.5" />
          Contact support
        </Link>
      </div>
    </div>
  );
}

export function WithdrawalKycRequiredBanner({ status }: { status: KycStatus }) {
  const title =
    status === "pending"
      ? "Verification in review"
      : status === "rejected"
        ? "Verification needs attention"
        : "Verify your identity";
  const desc =
    status === "pending"
      ? "Your documents are being reviewed. You can explore payout options while you wait; withdrawals unlock once approved."
      : status === "rejected"
        ? "Your last submission was rejected. Complete verification again to unlock withdrawals."
        : "Identity verification is required before you can submit a withdrawal request.";

  return (
    <div className="rounded-2xl border border-brand/25 bg-brand/5 p-4 flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
        <FileCheck className="w-4 h-4" />
      </span>
      <div>
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <p className="text-xs text-text-tertiary mt-1 leading-relaxed">{desc}</p>
        <Link
          href="/dashboard/kyc"
          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-brand hover:text-brand-hover"
        >
          <FileCheck className="w-3.5 h-3.5" />
          {status === "pending" ? "View verification status" : "Start verification"}
        </Link>
      </div>
    </div>
  );
}

export function WithdrawalSuspendedBanner({ reason }: { reason?: string | null }) {
  return (
    <div className="rounded-2xl border border-red/30 bg-red/5 p-4 flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red/10 text-red">
        <AlertTriangle className="w-4 h-4" />
      </span>
      <div>
        <p className="text-sm font-semibold text-text-primary">Account suspended</p>
        <p className="text-xs text-text-tertiary mt-1 leading-relaxed">
          Withdrawals are disabled while your account is suspended. Contact admin through support to resolve this.
        </p>
        {reason?.trim() && (
          <p className="text-xs text-text-tertiary mt-2">
            <span className="font-medium text-text-secondary">Reason:</span> {reason.trim()}
          </p>
        )}
        <Link
          href="/dashboard/support"
          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-brand hover:text-brand-hover"
        >
          <Comments className="w-3.5 h-3.5" />
          Contact admin
        </Link>
      </div>
    </div>
  );
}

export function WithdrawalPendingFeesBanner({ fees }: { fees: UserFeeRow[] }) {
  const total = fees.reduce((sum, fee) => sum + Number(fee.amount), 0);
  const primaryFee = fees[0];

  return (
    <div className="rounded-2xl border border-brand/25 bg-brand/5 p-4 sm:p-5 space-y-4">
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
          <AlertTriangle className="w-4 h-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-text-primary">Withdrawal fee required</p>
          <p className="text-xs text-text-tertiary mt-1 leading-relaxed">
            You must deposit the fee amount below. It cannot be paid from your existing balance — once your
            deposit is approved, the fee is cleared automatically.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {fees.map((fee) => (
          <li
            key={fee.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-primary/70 px-3.5 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">{fee.label}</p>
              {fee.notes && (
                <p className="text-[11px] text-text-tertiary mt-0.5 truncate">{fee.notes}</p>
              )}
            </div>
            <p className="shrink-0 font-bold font-mono text-text-primary">
              {formatCurrency(Number(fee.amount))}
            </p>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-bg-primary/50 px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Total due via deposit</p>
          <p className="text-xl font-bold font-mono text-text-primary">{formatCurrency(total)}</p>
        </div>
        <Link
          href={
            primaryFee
              ? `/dashboard/deposit?feeId=${primaryFee.id}&amount=${total.toFixed(2)}`
              : `/dashboard/deposit?amount=${total.toFixed(2)}`
          }
          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-brand text-bg-primary text-sm font-semibold hover:bg-brand-hover transition-colors"
        >
          <ArrowDownToLine className="w-4 h-4" />
          Deposit to pay fee
        </Link>
      </div>
    </div>
  );
}

export function WithdrawalMethodPicker({
  method,
  onChange,
}: {
  method: WithdrawalMethodId;
  onChange: (id: WithdrawalMethodId) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Payout method</h2>
        <p className="text-xs text-text-tertiary mt-1">How would you like to receive your funds?</p>
      </div>

      <div className="scroll-x flex gap-2.5 pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-3 sm:pb-0 sm:overflow-visible">
        {WITHDRAWAL_METHODS.map((item) => {
          const Icon = METHOD_ICONS[item.id];
          const active = method === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "shrink-0 w-[calc(50%-0.3125rem)] sm:w-auto flex flex-col items-start rounded-xl border p-3.5 text-left transition-all cursor-pointer",
                active
                  ? "border-brand/50 bg-brand/5 shadow-[0_0_0_1px_rgba(240,185,11,0.12)]"
                  : "border-border bg-bg-primary hover:border-border-light hover:bg-bg-hover/30"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg mb-2",
                  active ? "bg-brand/15 text-brand" : "bg-bg-secondary text-text-tertiary"
                )}
              >
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-sm font-semibold text-text-primary">{item.shortLabel}</span>
              <span className="text-[11px] text-text-tertiary mt-0.5">{item.timingHint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WithdrawalCodeField({
  value,
  onChange,
  hasCode,
}: {
  value: string;
  onChange: (value: string) => void;
  hasCode?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Input
        id="withdrawal-code"
        label="Withdrawal Code *"
        placeholder="Enter your unique withdrawal code"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        className="font-mono tracking-wide uppercase"
      />
      {hasCode === false && (
        <p className="flex items-start gap-2 text-xs leading-relaxed text-amber-600 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            No active withdrawal code. Please{" "}
            <Link href="/dashboard/support" className="font-semibold underline-offset-2 hover:underline">
              contact support
            </Link>{" "}
            to request one.
          </span>
        </p>
      )}
    </div>
  );
}

export function WithdrawalAmountField({
  balance,
  amount,
  onChange,
  min,
}: {
  balance: number;
  amount: string;
  onChange: (value: string) => void;
  min: number;
}) {
  const presets = [
    { label: "25%", pct: 0.25 },
    { label: "50%", pct: 0.5 },
    { label: "Max", pct: 1 },
  ];

  return (
    <div className="rounded-xl border border-border bg-bg-primary/60 p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <label htmlFor="withdraw-amount" className="text-sm font-medium text-text-primary">
          Amount (USD)
        </label>
        <span className="text-xs text-text-tertiary">{formatCurrency(balance)} available</span>
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-text-tertiary">
          $
        </span>
        <input
          id="withdraw-amount"
          type="number"
          min={min}
          step="0.01"
          max={balance}
          placeholder="0.00"
          value={amount}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 pl-8 pr-4 rounded-lg border border-border bg-bg-secondary text-lg font-semibold font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      {balance > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {presets.map(({ label, pct }) => {
            const val =
              pct === 1 ? balance : Math.floor(balance * pct * 100) / 100;
            if (val < min) return null;
            const valStr = val.toFixed(2);
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChange(valStr)}
                className={cn(
                  "rounded-lg border py-2 text-center transition-colors cursor-pointer",
                  amount === valStr
                    ? "border-brand/40 bg-brand/10 text-brand"
                    : "border-border bg-bg-secondary text-text-tertiary hover:text-text-primary hover:bg-bg-hover"
                )}
              >
                <span className="block text-[10px] uppercase tracking-wider opacity-70">{label}</span>
                <span className="text-xs font-semibold font-mono">{formatCurrency(val)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function WithdrawalPayoutSummary({
  amount,
  methodId,
  methodLabel,
  processingTime,
}: {
  amount: number;
  methodId: WithdrawalMethodId;
  methodLabel: string;
  processingTime: string;
}) {
  const fee = calculateWithdrawalFee(amount, methodId);
  const receive = estimateReceiveAmount(amount, methodId);
  const method = getWithdrawalMethod(methodId);

  if (!amount || amount <= 0) return null;

  return (
    <div className="rounded-xl border border-border bg-bg-primary/40 p-4 space-y-2.5 text-[13px]">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Payout summary</p>
      <div className="flex justify-between gap-4">
        <span className="text-text-tertiary">Method</span>
        <span className="text-text-secondary text-right">{methodLabel}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-text-tertiary">Processing</span>
        <span className="text-text-secondary text-right inline-flex items-center gap-1">
          <Clock className="w-3 h-3 shrink-0" />
          {processingTime}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-text-tertiary">Platform fee</span>
        <span className="font-mono text-text-secondary">
          {fee > 0 ? formatCurrency(fee) : method.feeLabel}
        </span>
      </div>
      <div className="border-t border-border pt-2.5 flex justify-between gap-4">
        <span className="font-medium text-text-primary">You receive</span>
        <span className="font-bold font-mono text-brand">{formatCurrency(receive)}</span>
      </div>
    </div>
  );
}

export function WithdrawalConfirmBar({
  amount,
  methodLabel,
  loading,
  onCancel,
  onConfirm,
}: {
  amount: number;
  methodLabel: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 space-y-3">
      <p className="text-sm text-text-primary">
        Confirm withdrawal of <strong className="font-mono">{formatCurrency(amount)}</strong> via{" "}
        <strong>{methodLabel}</strong>?
      </p>
      <p className="text-xs text-text-tertiary leading-relaxed">
        This request will be queued for team review. You cannot edit it after submission.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="button" onClick={onConfirm} disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4" />
              Submitting…
            </span>
          ) : (
            "Confirm withdrawal"
          )}
        </Button>
      </div>
    </div>
  );
}

export function WithdrawalSecurityNote() {
  return (
    <div className="flex gap-3 rounded-xl border border-border/70 bg-bg-primary/50 px-4 py-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Shield className="w-4 h-4" />
      </span>
      <div className="text-xs text-text-tertiary leading-relaxed sm:text-[13px]">
        <p className="font-medium text-text-secondary">Secure payouts</p>
        <p className="mt-1">
          All withdrawals are manually reviewed. Most requests are processed within 24–48 hours.
        </p>
      </div>
    </div>
  );
}

export function WithdrawalAlert({
  type,
  children,
}: {
  type: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <p
      role={type === "error" ? "alert" : undefined}
      className={cn(
        "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm",
        type === "success"
          ? "border-green/30 bg-green/5 text-green"
          : "border-red/25 bg-red/5 text-red"
      )}
    >
      {type === "success" && <CircleCheck className="w-4 h-4 shrink-0 mt-0.5" />}
      {type === "error" && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
      <span>{children}</span>
    </p>
  );
}

export function WithdrawalStatusBadge({ status }: { status: string }) {
  const tone = withdrawalStatusTone(status);
  return (
    <span
      className={cn(
        "text-[10px] px-2 py-0.5 rounded-full font-medium capitalize shrink-0",
        tone === "success" && "bg-green/10 text-green",
        tone === "error" && "bg-red/10 text-red",
        tone === "pending" && "bg-brand/10 text-brand"
      )}
    >
      {status}
    </span>
  );
}

export function WithdrawalHistoryList({ withdrawals }: { withdrawals: WithdrawalRow[] }) {
  if (withdrawals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-bg-primary text-text-tertiary">
          <ArrowUpFromLine className="w-5 h-5" />
        </div>
        <p className="mt-3 text-sm font-medium text-text-primary">No withdrawals yet</p>
        <p className="mt-1 text-xs text-text-tertiary">Your payout history will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {withdrawals.map((w) => {
        const methodId = w.method as WithdrawalMethodId;
        const Icon = METHOD_ICONS[methodId] ?? ArrowUpFromLine;
        const dest = formatWithdrawalDestination(w);
        const isCrypto = w.method === "crypto";

        return (
          <div
            key={w.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-bg-primary/50 px-3.5 py-3"
          >
            {isCrypto ? (
              <CryptoIcon symbol={w.currency} label={w.currency} size="sm" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-secondary text-text-tertiary">
                <Icon className="w-4 h-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold font-mono text-text-primary">
                  {formatCurrency(w.amount)} {w.currency}
                </p>
                <WithdrawalStatusBadge status={w.status} />
              </div>
              <p className="text-xs text-text-tertiary mt-0.5 truncate">
                {formatWithdrawalMethodLabel(w.method)} · {formatDate(w.created_at)}
              </p>
              {dest !== "—" && (
                <p className="text-[11px] text-text-tertiary mt-0.5 font-mono truncate">{dest}</p>
              )}
              {w.status === "rejected" && w.rejection_reason && (
                <p className="mt-1 text-[11px] leading-relaxed text-red/90">
                  Reason: {w.rejection_reason}
                </p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 text-text-tertiary opacity-40" aria-hidden />
          </div>
        );
      })}
    </div>
  );
}

export { Input, METHOD_ICONS };
