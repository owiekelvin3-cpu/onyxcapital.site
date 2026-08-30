"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { getSignalStrength } from "@/lib/signal-strength";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/components/dashboard/decko/decko-motion";

const RING_SIZE_DEFAULT = 112;
const RING_SIZE_COMPACT = 80;
const STROKE = 7;

export function SignalStrengthCard({
  signalPct,
  compact = false,
}: {
  signalPct: number;
  compact?: boolean;
}) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, signalPct));
  const strength = useMemo(() => getSignalStrength(clamped), [clamped]);
  const animatedPct = useCountUp(clamped, { duration: 1.6, decimals: 0 });
  const ringSize = compact ? RING_SIZE_COMPACT : RING_SIZE_DEFAULT;
  const radius = (ringSize - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("decko-card signal-strength-card relative overflow-hidden", compact ? "p-4" : "p-5")}>
      {!reduce && (
        <>
          <motion.span
            className="signal-strength-orb pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl"
            style={{ background: strength.glow }}
            animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.9, 1.08, 0.9] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
          <motion.span
            className="signal-strength-scan pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${strength.color}, transparent)` }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "linear", repeatDelay: 1.2 }}
            aria-hidden
          />
        </>
      )}

      <p className="text-sm font-medium text-text-secondary">Signal</p>

      <div className={cn("mt-4 flex items-center gap-4", compact && "mt-3 gap-3")}>
        <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
          <svg width={ringSize} height={ringSize} className="-rotate-90" aria-hidden>
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke={strength.track}
              strokeWidth={STROKE}
            />
            <motion.circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke={strength.color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={reduce ? false : { strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                filter: reduce ? undefined : `drop-shadow(0 0 8px ${strength.glow})`,
              }}
            />
          </svg>
          {!reduce && (
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ boxShadow: `0 0 24px ${strength.glow}` }}
              animate={{ opacity: [0.2, 0.55, 0.2] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <motion.span
              key={animatedPct}
              className={cn(
                "font-bold tabular-nums tracking-tight",
                compact ? "text-2xl" : "text-4xl"
              )}
              style={{ color: strength.color }}
              initial={reduce ? false : { opacity: 0, y: 8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {animatedPct}%
            </motion.span>
            <motion.span
              key={strength.label}
              className={cn("font-semibold", compact ? "text-base" : "text-lg")}
              style={{ color: strength.color }}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              {strength.label}
            </motion.span>
          </div>
          <p className="mt-2 text-xs text-text-tertiary">
            {clamped >= 100
              ? "Your signals plan is active. Full desk allocation is in effect."
              : "This figure represents your current trading desk allocation."}
          </p>
        </div>
      </div>

      <div className={cn("border-t border-border/70 pt-4", compact ? "mt-4" : "mt-5")}>
        <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-text-tertiary">
          <span>Strength meter</span>
          <span>{clamped.toFixed(0)} / 100</span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-bg-tertiary">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${strength.color}, ${strength.glow})`,
              boxShadow: `0 0 12px ${strength.glow}`,
            }}
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${clamped}%` }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          />
          {!reduce && clamped > 0 && (
            <motion.span
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-bg-secondary"
              style={{ background: strength.color, left: `calc(${clamped}% - 6px)` }}
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            />
          )}
        </div>
      </div>
    </div>
  );
}
