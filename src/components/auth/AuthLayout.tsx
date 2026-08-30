"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { BRAND, PLATFORM_HIGHLIGHTS } from "@/lib/constants";
import { OnyxLogo } from "@/components/brand/OnyxLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ArrowLeft, ArrowRight, Clock, HelpCircle, Layers, Receipt, Shield } from "@/components/icons";
import {
  AuthBackground,
  AuthFormBackground,
  AuthItem,
  AuthLogoPulse,
  AuthStagger,
} from "@/components/auth/auth-motion";

const FEATURE_ICONS = [Shield, Receipt, Layers, Clock] as const;

const LIVE_STATS = [
  { value: "500+", label: "Trading pairs" },
  { value: "0.10%", label: "Spot fees" },
  { value: "99.99%", label: "Uptime" },
] as const;

export function AuthShell({
  children,
  wide = false,
  panelTitle,
  panelSubtitle,
}: {
  children: React.ReactNode;
  wide?: boolean;
  panelTitle?: string;
  panelSubtitle?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="auth-page relative flex min-h-dvh flex-col overflow-x-hidden lg:h-dvh lg:max-h-dvh lg:flex-row lg:overflow-hidden">
      <AuthBackground />

      {/* Brand panel — desktop */}
      <aside className="auth-panel relative hidden lg:flex lg:w-[44%] xl:w-[42%] flex-col overflow-hidden border-r border-border/60">
        <div className="relative z-10 flex h-16 items-center justify-between border-b border-border/40 px-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <AuthLogoPulse>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--brand-accent)]/20 bg-[var(--brand-accent)]/10 shadow-[var(--shadow-glow)]">
                <OnyxLogo size={24} />
              </span>
            </AuthLogoPulse>
            <span className="text-base font-bold text-text-primary transition-colors group-hover:text-brand">
              {BRAND.name}
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle className="rounded-xl border border-border/60 bg-bg-secondary/60" />
            <Link
              href="/help"
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
            >
              <HelpCircle className="h-4 w-4" />
              Help
            </Link>
          </div>
        </div>

        <AuthStagger className="relative z-10 flex min-h-0 flex-1 flex-col justify-center overflow-hidden px-8 py-6 xl:px-12">
          <AuthItem>
            <Link
              href="/"
              className="mb-4 inline-flex w-fit items-center gap-1.5 text-[13px] text-text-tertiary transition-colors hover:text-brand xl:mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </AuthItem>

          <AuthItem>
            <p className="auth-panel-label mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--brand-accent)]/25 bg-[var(--brand-accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-green"
                animate={reduce ? undefined : { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              Live markets
            </p>
            <h2 className="max-w-md text-[28px] font-bold leading-tight tracking-tight text-text-primary xl:text-[38px]">
              {panelTitle ?? BRAND.tagline}
            </h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-text-secondary">
              {panelSubtitle ?? BRAND.description}
            </p>
          </AuthItem>

          <AuthItem className="mt-5 xl:mt-8">
            <div className="flex flex-wrap gap-2">
              {LIVE_STATS.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={reduce ? undefined : { y: -3, scale: 1.02 }}
                  className="rounded-2xl border border-border/70 bg-bg-secondary/50 px-3 py-2 backdrop-blur-sm xl:px-4 xl:py-3"
                >
                  <p className="text-base font-bold tabular-nums text-text-primary xl:text-lg">{stat.value}</p>
                  <p className="text-[11px] text-text-tertiary">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </AuthItem>

          <ul className="mt-5 hidden space-y-2 xl:block xl:mt-8 xl:space-y-3">
            {PLATFORM_HIGHLIGHTS.map((item, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <AuthItem key={item.title} variant="scale">
                  <motion.li
                    whileHover={reduce ? undefined : { x: 6 }}
                    className="flex items-start gap-3 rounded-2xl border border-transparent p-3 transition-colors hover:border-border/60 hover:bg-bg-secondary/40"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-accent)]/15 text-brand">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-text-primary">{item.title}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-text-tertiary">{item.desc}</p>
                    </div>
                  </motion.li>
                </AuthItem>
              );
            })}
          </ul>

          <AuthItem className="mt-6 hidden xl:block xl:mt-10">
            <Link
              href="/markets"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
            >
              Explore live markets
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </AuthItem>
        </AuthStagger>
      </aside>

      {/* Form panel */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:h-dvh lg:max-h-dvh lg:overflow-hidden">
        <header className="safe-area-top shrink-0 border-b border-border/60 safe-area-x lg:hidden">
          <div className="flex h-12 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              <AuthLogoPulse>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-accent)]/15">
                  <OnyxLogo size={22} />
                </span>
              </AuthLogoPulse>
              <span className="font-bold text-text-primary">{BRAND.name}</span>
            </Link>
            <div className="flex items-center gap-1">
              <ThemeToggle className="rounded-lg border border-border bg-bg-secondary" />
              <Link href="/help" className="p-2 text-text-tertiary">
                <HelpCircle className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-3 py-4 safe-area-x sm:items-center sm:px-4 sm:py-3 lg:overflow-hidden lg:px-6">
          <AuthStagger
            className={
              wide
                ? "auth-form-card auth-form-card--wide relative w-full max-w-[520px]"
                : "auth-form-card relative w-full max-w-[420px]"
            }
          >
            <AuthFormBackground />
            <AuthItem variant="scale" className="min-h-0">
              {children}
            </AuthItem>
          </AuthStagger>
        </main>

        <footer className="safe-area-bottom hidden shrink-0 border-t border-border/40 px-4 pb-[max(0.75rem,var(--safe-bottom))] pt-3 lg:block">
          <p className="text-center text-[11px] text-text-tertiary">
            &copy; {new Date().getFullYear()} {BRAND.fullName}. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}

export function AuthLogo({ size = 28 }: { size?: number }) {
  return <OnyxLogo size={size} />;
}

export function AuthCardHeader({
  title,
  subtitle,
  alternate,
}: {
  title: string;
  subtitle: string;
  alternate: { prompt: string; href: string; label: string };
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="mb-4 sm:mb-5"
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      <h1 className="text-[22px] font-bold tracking-tight text-text-primary sm:text-[26px] lg:text-[30px]">
        {title}
      </h1>
      <p className="mt-1 text-[13px] text-text-tertiary sm:text-[14px]">{subtitle}</p>
      <p className="mt-3 border-t border-border pt-3 text-[13px] text-text-tertiary sm:mt-4 sm:pt-4 sm:text-[14px]">
        {alternate.prompt}{" "}
        <Link
          href={alternate.href}
          className="group inline-flex items-center gap-1 font-semibold text-brand transition-colors hover:text-brand-hover"
        >
          {alternate.label}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </p>
    </motion.div>
  );
}
