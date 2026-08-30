"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

const fadeScale = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease } },
};

const slideIn = {
  initial: { opacity: 0, x: 28 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.45, ease } },
  exit: { opacity: 0, x: -28, transition: { duration: 0.3, ease } },
};

export function AuthBackground() {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="auth-mesh absolute inset-0 opacity-40" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="auth-mesh absolute inset-0" />
      <motion.div
        className="auth-orb auth-orb-a absolute -left-24 top-[12%] h-72 w-72 rounded-full"
        animate={{ x: [0, 24, 0], y: [0, -18, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="auth-orb auth-orb-b absolute -right-16 bottom-[18%] h-56 w-56 rounded-full"
        animate={{ x: [0, -20, 0], y: [0, 14, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.div
        className="auth-orb auth-orb-c absolute left-[38%] top-[55%] h-40 w-40 rounded-full"
        animate={{ opacity: [0.35, 0.65, 0.35], scale: [0.9, 1.15, 0.9] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
    </div>
  );
}

export function AuthFormBackground() {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.35rem]" aria-hidden>
      <motion.div
        className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[var(--brand-accent)]/10 blur-2xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export function AuthStagger({
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
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function AuthItem({
  children,
  className,
  variant = "up",
}: {
  children: ReactNode;
  className?: string;
  variant?: "up" | "scale";
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={variant === "scale" ? fadeScale : fadeUp}>
      {children}
    </motion.div>
  );
}

export function AuthSlidePanel({
  panelKey,
  children,
  className,
}: {
  panelKey: string | number;
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={panelKey}
        className={className}
        variants={slideIn}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function AuthAlert({
  show,
  variant,
  children,
}: {
  show: boolean;
  variant: "error" | "info";
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const classes =
    variant === "error"
      ? "text-red bg-red/[0.08] border-red/30"
      : "text-green bg-green/[0.08] border-green/30";

  if (reduce) {
    if (!show) return null;
    return (
      <div className={`text-[13px] border rounded-xl px-4 py-3 ${classes}`} role="alert">
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.3, ease }}
          className={`overflow-hidden text-[13px] border rounded-xl px-4 py-3 ${classes}`}
          role="alert"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AuthSubmitButton({
  children,
  disabled,
  loading,
  type = "submit",
  onClick,
  className,
}: {
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      whileHover={reduce || disabled ? undefined : { scale: 1.02, y: -1 }}
      whileTap={reduce || disabled ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className={className}
    >
      {children}
    </motion.button>
  );
}

export function AuthLogoPulse({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;

  return (
    <motion.span
      className="relative inline-flex"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.1 }}
    >
      <motion.span
        className="absolute inset-0 rounded-full bg-[var(--brand-accent)]/30"
        animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
        aria-hidden
      />
      {children}
    </motion.span>
  );
}
