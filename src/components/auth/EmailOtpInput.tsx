"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { EMAIL_OTP_LENGTH } from "@/lib/auth/email-otp";

export function EmailOtpInput({
  value,
  onChange,
  disabled,
  error,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  error?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: EMAIL_OTP_LENGTH }, (_, index) => value[index] ?? "");

  function focusAt(index: number) {
    refs.current[Math.max(0, Math.min(EMAIL_OTP_LENGTH - 1, index))]?.focus();
  }

  function writeDigits(next: string[]) {
    onChange(next.join("").replace(/\D/g, "").slice(0, EMAIL_OTP_LENGTH));
  }

  function handlePaste(index: number, raw: string) {
    const pasted = raw.replace(/\D/g, "").slice(0, EMAIL_OTP_LENGTH);
    if (!pasted) return;
    const next = digits.slice();
    for (let i = 0; i < pasted.length && index + i < EMAIL_OTP_LENGTH; i += 1) {
      next[index + i] = pasted[i] ?? "";
    }
    writeDigits(next);
    focusAt(Math.min(index + pasted.length, EMAIL_OTP_LENGTH - 1));
  }

  return (
    <div className="space-y-2">
      <p className="block text-[12px] font-medium text-text-secondary sm:text-[13px]">
        6-digit code
      </p>
      <div className="flex justify-between gap-1.5 sm:gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              refs.current[index] = node;
            }}
            id={index === 0 ? "email-otp" : undefined}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            autoCorrect="off"
            spellCheck={false}
            maxLength={1}
            disabled={disabled}
            aria-label={`Digit ${index + 1} of ${EMAIL_OTP_LENGTH}`}
            value={digit}
            onChange={(event) => {
              const incoming = event.target.value.replace(/\D/g, "");
              if (incoming.length > 1) {
                handlePaste(index, incoming);
                return;
              }
              const next = digits.slice();
              next[index] = incoming.slice(-1);
              writeDigits(next);
              if (incoming) focusAt(index + 1);
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !digits[index]) {
                event.preventDefault();
                const next = digits.slice();
                next[index - 1] = "";
                writeDigits(next);
                focusAt(index - 1);
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                focusAt(index - 1);
              }
              if (event.key === "ArrowRight") {
                event.preventDefault();
                focusAt(index + 1);
              }
            }}
            onPaste={(event) => {
              event.preventDefault();
              handlePaste(index, event.clipboardData.getData("text"));
            }}
            onFocus={(event) => event.target.select()}
            className={cn(
              "h-12 w-10 min-w-0 rounded-xl border bg-bg-secondary/80 text-center text-lg font-semibold tabular-nums text-text-primary outline-none transition-shadow sm:h-14 sm:w-12 sm:text-xl",
              error
                ? "border-red shadow-[0_0_0_3px_color-mix(in_srgb,var(--red)_12%,transparent)]"
                : "border-border focus:border-brand focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-accent)_18%,transparent)]",
              disabled && "cursor-not-allowed opacity-60"
            )}
          />
        ))}
      </div>
    </div>
  );
}
