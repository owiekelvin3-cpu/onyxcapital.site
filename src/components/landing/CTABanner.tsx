"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "@/components/icons";
import { FadeUp } from "@/components/landing/motion";
import { BRAND } from "@/lib/constants";

export function CTABanner() {
  const reduce = useReducedMotion();

  return (
    <section className="py-16 sm:py-20">
      <div className="container-app">
        <FadeUp>
          <motion.div
            whileHover={reduce ? undefined : { scale: 1.005 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-brand px-6 py-12 sm:px-12 sm:py-16 text-center shadow-[var(--shadow-premium)]"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 50%, white 0%, transparent 40%)",
              }}
              aria-hidden
            />
            <div className="relative">
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-brand-text">
                Ready to trade on {BRAND.fullName}?
              </h2>
              <p className="mt-3 text-sm sm:text-base text-brand-text/80 max-w-xl mx-auto">
                Join millions of traders on a platform built for performance, security, and clarity.
                Open your account in under a minute.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/register">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="bg-bg-secondary text-text-primary hover:bg-bg-hover border border-border min-w-[180px]"
                  >
                    Get started free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="text-brand-text hover:bg-brand-text/10 min-w-[180px]"
                  >
                    Explore platform
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </FadeUp>
      </div>
    </section>
  );
}
