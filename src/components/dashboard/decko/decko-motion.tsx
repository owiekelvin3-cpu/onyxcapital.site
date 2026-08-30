"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

export function useCountUp(
  target: number,
  { duration = 1.4, decimals = 0 }: { duration?: number; decimals?: number } = {}
) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);

  useEffect(() => {
    if (reduce) {
      setValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduce]);

  return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString();
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

export function DeckoStagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function DeckoStaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}

export function DeckoAnimatedBar({
  height,
  delay = 0,
  active,
  onHover,
  onLeave,
}: {
  height: number;
  delay?: number;
  active?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="relative flex h-full flex-1 flex-col justify-end">
      <motion.div
        className="w-full rounded-t-xl bg-[var(--decko-accent)]"
        initial={reduce ? false : { height: 0 }}
        animate={{ height: `${height}%` }}
        transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        style={{ minHeight: active ? 8 : 4 }}
      />
    </div>
  );
}

export function DeckoProgressBar({
  value,
  delay = 0,
}: {
  value: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="h-3 overflow-hidden rounded-full bg-bg-tertiary">
      <motion.div
        className="h-full rounded-full bg-[var(--decko-accent)]"
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
