"use client";

import { motion, useReducedMotion } from "framer-motion";
import { PREMIUM_FEATURES } from "@/lib/constants";
import { FadeUp, Stagger, StaggerItem } from "@/components/landing/motion";
import { cn } from "@/lib/utils";

export function FeaturesSection() {
  const reduce = useReducedMotion();

  return (
    <section className="fin-page-plain py-16 sm:py-24 lg:py-28 bg-bg-primary relative overflow-hidden">
      <div
        className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-30"
        style={{
          background: "radial-gradient(circle, rgba(226, 255, 76, 0.12) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      <div className="container-app relative">
        <FadeUp className="max-w-2xl mb-12 sm:mb-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand mb-3">
            Platform capabilities
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-text-primary leading-tight">
            Everything you need to trade like an institution
          </h2>
          <p className="mt-4 text-base text-text-secondary leading-relaxed">
            From retail traders to hedge funds — Onyx Capital delivers the infrastructure, liquidity, and
            tools that serious market participants demand.
          </p>
        </FadeUp>

        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {PREMIUM_FEATURES.map((feature, index) => (
            <StaggerItem key={feature.title}>
              <motion.div
                whileHover={reduce ? undefined : { y: -4 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={cn(
                  "group relative h-full rounded-2xl border border-border bg-bg-secondary p-6 sm:p-7",
                  "shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-premium)] transition-shadow duration-300",
                  index === 0 && "sm:col-span-2 lg:col-span-1 lg:row-span-1"
                )}
              >
                <span className="inline-flex rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand">
                  {feature.tag}
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-text-primary group-hover:text-brand transition-colors">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{feature.desc}</p>
                <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-brand/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
