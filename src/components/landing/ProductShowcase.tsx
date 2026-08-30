"use client";

import Link from "next/link";
import { ArrowRight, Bot, Copy, TrendingUp } from "@/components/icons";
import { PRODUCTS } from "@/lib/constants";
import { FadeUp, Stagger, StaggerItem } from "@/components/landing/motion";

const ICONS = [TrendingUp, Copy, Bot] as const;

export function ProductShowcase() {
  return (
    <section className="relative bg-bg-primary py-12 sm:py-16 lg:py-20 overflow-hidden">
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-brand/[0.03] blur-3xl" aria-hidden />

      <div className="container-app relative">
        <FadeUp>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2 text-balance">
            Futures, copy, bots
          </h2>
          <p className="text-sm text-text-tertiary mb-8 sm:mb-10 max-w-lg">
            Three ways to trade — same dashboard, same fee structure. Pick what fits how you actually work.
          </p>
        </FadeUp>

        <Stagger className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {PRODUCTS.map((product, i) => {
            const Icon = ICONS[i];
            return (
              <StaggerItem key={product.title}>
                <Link
                  href={product.href}
                  className="group relative block bg-bg-secondary border border-border rounded-2xl p-4 sm:p-6 overflow-hidden transition-all duration-300 hover:border-brand/25 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] touch-target"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <span className="inline-flex w-9 h-9 rounded-lg bg-bg-primary border border-border items-center justify-center mb-3 transition-colors group-hover:border-brand/30">
                      <Icon className="w-4 h-4 text-brand" strokeWidth={1.75} />
                    </span>
                    <h3 className="text-base font-semibold text-text-primary group-hover:text-brand transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-sm text-text-tertiary mt-2 leading-relaxed">{product.desc}</p>
                    <span className="inline-flex items-center gap-1 text-sm text-brand mt-3 sm:mt-4 font-medium">
                      {product.cta}
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
