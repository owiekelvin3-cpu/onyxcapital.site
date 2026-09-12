"use client";

import { tryParseUsdAmount } from "@/lib/admin-api";
import { formatCurrency, cn } from "@/lib/utils";

function sanitizeUsdTyping(raw: string) {
  return raw.replace(/[^\d.,]/g, "");
}

export function AdminUsdInput({
  id,
  value,
  onChange,
  placeholder = "Amount (USD)",
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const parsed = value.trim() ? tryParseUsdAmount(value) : null;
  const invalid = Boolean(value.trim()) && parsed == null;

  return (
    <div className={cn("space-y-1.5", className)}>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(sanitizeUsdTyping(e.target.value))}
        onWheel={(e) => e.currentTarget.blur()}
        className={cn(
          "h-11 w-full rounded border border-border bg-bg-primary px-3 text-base text-text-primary placeholder:text-text-tertiary",
          "focus:border-brand focus:outline-none",
          invalid && "border-red"
        )}
      />
      {parsed != null && (
        <p className="text-xs text-text-tertiary">Will apply {formatCurrency(parsed)}</p>
      )}
      {invalid && <p className="text-xs text-red">Enter a valid dollar amount.</p>}
    </div>
  );
}
