"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function AuthSteps({
  steps,
  current,
}: {
  steps: { label: string }[];
  current: number;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="mb-4 sm:mb-5">
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, i) => {
          const index = i + 1;
          const done = index < current;
          const active = index === current;

          return (
            <div key={step.label} className="flex min-w-0 flex-1 items-center gap-2">
              <div className="relative">
                {active && !reduce && (
                  <motion.span
                    layoutId="auth-step-ring"
                    className="absolute -inset-1 rounded-full border-2 border-[var(--brand-accent)]/50"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                )}
                <motion.div
                  initial={false}
                  animate={{
                    scale: active ? 1.08 : 1,
                    backgroundColor: done
                      ? "var(--green)"
                      : active
                        ? "var(--brand-accent)"
                        : "var(--bg-hover)",
                  }}
                  transition={{ type: "spring", stiffness: 420, damping: 26 }}
                  className={cn(
                    "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold sm:h-8 sm:w-8 sm:text-[11px]",
                    done && "text-white",
                    active && "text-[var(--fin-btn-fg)] shadow-[var(--shadow-glow)]",
                    !done && !active && "border border-border text-text-tertiary"
                  )}
                >
                  {done ? "✓" : index}
                </motion.div>
              </div>
              <span
                className={cn(
                  "hidden truncate text-[12px] font-medium sm:block",
                  active ? "text-text-primary" : "text-text-tertiary"
                )}
              >
                {step.label}
              </span>
              {i < steps.length - 1 && (
                <div className="relative mx-1 hidden h-px flex-1 overflow-hidden rounded-full bg-border sm:block">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-green/60"
                    initial={false}
                    animate={{ width: done ? "100%" : active ? "50%" : "0%" }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <motion.p
        key={current}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 text-[13px] text-text-tertiary sm:hidden"
      >
        Step {current} of {steps.length}: {steps[current - 1]?.label}
      </motion.p>
    </div>
  );
}

export function PasswordStrength({ password }: { password: string }) {
  const reduce = useReducedMotion();

  if (!password) return null;

  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
  ];

  const score = checks.filter((c) => c.ok).length;
  const label =
    score === 0 ? "Too weak" : score === 1 ? "Weak" : score === 2 ? "Fair" : "Strong";
  const color = score <= 1 ? "bg-red" : score === 2 ? "bg-brand" : "bg-green";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-2.5 space-y-2 overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3].map((level) => (
            <motion.div
              key={level}
              className={cn("h-[3px] flex-1 rounded-full", score >= level ? color : "bg-border")}
              initial={false}
              animate={{ scaleX: score >= level ? 1 : 0.6, opacity: score >= level ? 1 : 0.4 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </div>
        <span className="shrink-0 text-[11px] text-text-tertiary">{label}</span>
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map((c) => (
          <motion.li
            key={c.label}
            initial={false}
            animate={{ opacity: c.ok ? 1 : 0.65 }}
            className={cn("text-[11px]", c.ok ? "text-green" : "text-text-tertiary")}
          >
            {c.ok ? "✓" : "○"} {c.label}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

export function formatDobInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
