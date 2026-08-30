"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { SECURITY_FEATURES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Shield, CircleCheck, ArrowRight } from "@/components/icons";
import { FadeUp, Stagger, StaggerItem } from "@/components/landing/motion";

export function SecuritySection() {
  const reduce = useReducedMotion();

  return (
    <section className="fin-page-plain py-16 sm:py-24 landing-section-dark relative overflow-hidden">
      <div className="container-app">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <FadeUp>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3 py-1.5 text-xs font-medium text-brand mb-5">
              <Shield className="h-3.5 w-3.5" />
              Enterprise security
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
              Your assets protected by{" "}
              <span className="text-gradient-brand">institutional-grade</span> infrastructure
            </h2>
            <p className="mt-4 text-base text-text-secondary leading-relaxed max-w-lg">
              We treat security as a product feature, not an afterthought. Every layer — from
              custody to execution — is audited, insured, and monitored 24/7.
            </p>
            <Link href="/register" className="inline-block mt-8">
              <Button size="lg">
                Create secure account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </FadeUp>

          <Stagger className="grid sm:grid-cols-2 gap-3">
            {SECURITY_FEATURES.map((item) => (
              <StaggerItem key={item}>
                <motion.div
                  whileHover={reduce ? undefined : { scale: 1.02 }}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-bg-secondary/80 backdrop-blur-sm p-4 shadow-[var(--shadow-card)]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green/10 text-green">
                    <CircleCheck className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-medium text-text-primary leading-snug">{item}</p>
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
