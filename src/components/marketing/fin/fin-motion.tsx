"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export function useFinCountUp(
  target: number,
  { duration = 1.3, decimals = 0 }: { duration?: number; decimals?: number } = {}
) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (!inView || reduce) {
      setValue(target);
      return;
    }

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const p = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduce, inView]);

  if (decimals > 0) return { ref, text: value.toFixed(decimals) };
  return { ref, text: Math.round(value).toLocaleString("en-US") };
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const scrollContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

const itemScale = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease } },
};

const itemSlide = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease } },
};

export function FinStagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={container} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function FinScrollStagger({
  children,
  className,
  margin = "-80px",
}: {
  children: ReactNode;
  className?: string;
  margin?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={scrollContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin }}
    >
      {children}
    </motion.div>
  );
}

export function FinStaggerItem({
  children,
  className,
  variant = "up",
}: {
  children: ReactNode;
  className?: string;
  variant?: "up" | "scale" | "slide";
}) {
  const reduce = useReducedMotion();
  const variants = variant === "scale" ? itemScale : variant === "slide" ? itemSlide : item;
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}

export function FinReveal({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

export function FinGlow({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div
        className={className}
        style={{ background: "radial-gradient(circle, var(--brand-accent) 0%, transparent 70%)" }}
        aria-hidden
      />
    );
  }
  return (
    <motion.div
      className={className}
      aria-hidden
      animate={{
        scale: [1, 1.08, 1],
        opacity: [0.35, 0.55, 0.35],
      }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      style={{ background: "radial-gradient(circle, var(--brand-accent) 0%, transparent 70%)" }}
    />
  );
}

export function FinPulseDot({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <span className={cnDot(className)} aria-hidden />;
  }
  return (
    <span className={cnDot(className)} aria-hidden>
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full bg-green opacity-75"
        animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
      />
    </span>
  );
}

function cnDot(className?: string) {
  return ["relative inline-flex h-2 w-2 rounded-full bg-green", className].filter(Boolean).join(" ");
}

export function FinBar({
  height,
  delay = 0,
  className,
}: {
  height: number;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduce ? false : { height: 0, opacity: 0.6 }}
      animate={inView ? { height: `${height}%`, opacity: 1 } : { height: 0, opacity: 0.6 }}
      transition={{ duration: 0.8, delay, ease }}
    />
  );
}

export function FinProgressSegments({
  segments,
}: {
  segments: { value: number; color: string }[];
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div ref={ref} className="flex h-2 overflow-hidden rounded-full bg-bg-tertiary">
      {segments.map((seg, i) => (
        <motion.div
          key={i}
          className="h-full"
          style={{ backgroundColor: seg.color }}
          initial={reduce ? false : { width: 0, opacity: 0.5 }}
          animate={inView ? { width: `${seg.value}%`, opacity: 1 } : { width: 0, opacity: 0.5 }}
          transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease }}
        />
      ))}
    </div>
  );
}

export function FinHoverLift({
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
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      {children}
    </motion.div>
  );
}

export function FinColorBars({
  colors,
  className,
}: {
  colors: readonly string[];
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div ref={ref} className={["flex gap-1", className].filter(Boolean).join(" ")}>
      {colors.map((c, i) => (
        <motion.span
          key={c}
          className="h-1.5 w-6 rounded-full"
          style={{ backgroundColor: c }}
          initial={reduce ? false : { width: 0, opacity: 0 }}
          animate={inView ? { width: 24, opacity: 1 } : { width: 0, opacity: 0 }}
          transition={{ duration: 0.45, delay: 0.1 + i * 0.08, ease }}
        />
      ))}
    </div>
  );
}
