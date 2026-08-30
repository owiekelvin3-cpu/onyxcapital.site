"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui";
import { CheckCircle, Loader2, Shield } from "@/components/icons";
import { cn } from "@/lib/utils";

const STEP_KEYS = [
  "kyc.verifyingStepDoc",
  "kyc.verifyingStepFace",
  "kyc.verifyingStepSecurity",
  "kyc.verifyingStepFinalize",
] as const;

export function KycVerifyingOverlay({
  durationMs,
  onComplete,
}: {
  durationMs: number;
  onComplete: () => void;
}) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const onCompleteRef = useRef(onComplete);
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const stepInterval = useMemo(() => durationMs / STEP_KEYS.length, [durationMs]);

  useEffect(() => {
    if (reduce) {
      onCompleteRef.current();
      return;
    }

    const started = performance.now();
    let frame = 0;
    let finishTimer: number | undefined;

    const tick = (now: number) => {
      const elapsed = now - started;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);
      setStepIndex(Math.min(STEP_KEYS.length - 1, Math.floor(elapsed / stepInterval)));

      if (elapsed >= durationMs) {
        setDone(true);
        finishTimer = window.setTimeout(() => onCompleteRef.current(), 650);
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      if (finishTimer !== undefined) window.clearTimeout(finishTimer);
    };
  }, [durationMs, reduce, stepInterval]);

  return (
    <Card className="relative overflow-hidden !p-6 sm:!p-8">
      <div className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-brand/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -right-10 h-36 w-36 rounded-full bg-green/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-sm flex-col items-center text-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          {!reduce && (
            <>
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-brand/30"
                animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0.15, 0.55] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden
              />
              <motion.span
                className="absolute inset-2 rounded-full border border-green/25"
                animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.08, 0.35] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
                aria-hidden
              />
            </>
          )}
          <span
            className={cn(
              "relative flex h-16 w-16 items-center justify-center rounded-2xl",
              done ? "bg-green/15 text-green" : "bg-brand/15 text-brand"
            )}
          >
            {done ? <CheckCircle className="h-8 w-8" /> : <Shield className="h-8 w-8" />}
          </span>
        </div>

        <h3 className="mt-5 text-lg font-semibold text-text-primary">
          {done ? t("kyc.verifyingDoneTitle") : t("kyc.verifyingTitle")}
        </h3>
        <p className="mt-2 min-h-[2.5rem] text-sm leading-relaxed text-text-tertiary">
          {done ? t("kyc.verifyingDoneDesc") : t("kyc.verifyingDesc")}
        </p>

        {!done && (
          <>
            <div className="mt-6 w-full">
              <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-text-tertiary">
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5" />
                  {t("kyc.verifyingProgress")}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-bg-secondary">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-green"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: "linear", duration: 0.1 }}
                />
              </div>
            </div>

            <ul className="mt-5 w-full space-y-2 text-left">
              {STEP_KEYS.map((key, index) => {
                const active = index === stepIndex;
                const complete = index < stepIndex;
                return (
                  <li
                    key={key}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors",
                      active ? "bg-brand/10 text-text-primary" : "text-text-tertiary"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        complete
                          ? "bg-green text-white"
                          : active
                            ? "bg-brand/20 text-brand"
                            : "bg-bg-secondary"
                      )}
                    >
                      {complete ? <CheckCircle className="h-3 w-3" /> : index + 1}
                    </span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`${key}-${active}`}
                        initial={reduce ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.25 }}
                      >
                        {t(key)}
                      </motion.span>
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}
