"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CHOOSE_REASONS,
  COMMUNITY_REVIEWS,
  FRAMEWORK_STEPS,
  PLATFORM_FAQS,
} from "@/lib/broker-info";
import { BRAND } from "@/lib/constants";
import {
  FinHoverLift,
  FinScrollStagger,
  FinStaggerItem,
} from "@/components/marketing/fin/fin-motion";
import { ArrowRight, ChevronDown, CircleCheck, Star } from "@/components/icons";

export function FinReasonsGrid() {
  return (
    <section className="mt-4">
      <FinScrollStagger>
        <FinStaggerItem>
          <div className="mb-4 px-1">
            <p className="fin-section-label">7 reasons to choose us</p>
            <h2 className="mt-2 text-xl font-bold text-text-primary sm:text-2xl">
              Trade confidently and securely
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary">
              Learn proven strategies from experienced desks and grow capital with tools built for
              speed, safety, and control.
            </p>
          </div>
        </FinStaggerItem>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CHOOSE_REASONS.map((reason, i) => (
            <FinStaggerItem key={reason.title} variant="scale">
              <FinHoverLift className="fin-card h-full p-5 sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
                  Reason {i + 1}
                </p>
                <h3 className="mt-2 text-base font-bold text-text-primary">{reason.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{reason.desc}</p>
              </FinHoverLift>
            </FinStaggerItem>
          ))}
        </div>
      </FinScrollStagger>
    </section>
  );
}

export function FinFrameworkBlock() {
  return (
    <section className="mt-4">
      <FinScrollStagger>
        <FinStaggerItem>
          <div className="fin-card p-6 sm:p-8">
            <p className="fin-section-label">The {BRAND.name} framework</p>
            <h2 className="mt-2 text-xl font-bold text-text-primary sm:text-2xl">
              Profit from the market with a clear process
            </h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {FRAMEWORK_STEPS.map((item) => (
                <div key={item.step} className="rounded-2xl border border-border bg-bg-primary p-5">
                  <p className="text-xs font-bold tabular-nums text-brand">{item.step}</p>
                  <h3 className="mt-2 text-base font-bold text-text-primary">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </FinStaggerItem>
      </FinScrollStagger>
    </section>
  );
}

export function FinFaqAccordion() {
  const [open, setOpen] = useState(0);

  return (
    <section className="mt-4">
      <FinScrollStagger>
        <FinStaggerItem>
          <div className="fin-card overflow-hidden">
            <div className="border-b border-border px-6 py-5 sm:px-8">
              <p className="fin-section-label">FAQ</p>
              <h2 className="mt-2 text-xl font-bold text-text-primary sm:text-2xl">
                Frequently asked questions
              </h2>
            </div>
            <div className="divide-y divide-border">
              {PLATFORM_FAQS.map((item, i) => {
                const isOpen = open === i;
                return (
                  <div key={item.q}>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? -1 : i)}
                      className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left sm:px-8"
                    >
                      <span className="text-sm font-semibold text-text-primary">{item.q}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-text-tertiary transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden"
                        >
                          <p className="px-6 pb-5 text-sm leading-relaxed text-text-secondary sm:px-8">
                            {item.a}
                          </p>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </FinStaggerItem>
      </FinScrollStagger>
    </section>
  );
}

export function FinCommunityReviews() {
  return (
    <section className="mt-4">
      <FinScrollStagger>
        <FinStaggerItem>
          <div className="mb-4 flex items-end justify-between gap-4 px-1">
            <div>
              <p className="fin-section-label">Built for ambitious earners</p>
              <h2 className="mt-2 text-xl font-bold text-text-primary sm:text-2xl">
                What traders say
              </h2>
            </div>
            <Link
              href="/community"
              className="hidden text-sm font-medium text-text-tertiary hover:text-text-primary sm:block"
            >
              Community →
            </Link>
          </div>
        </FinStaggerItem>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {COMMUNITY_REVIEWS.map((review) => (
            <FinStaggerItem key={review.name} variant="scale">
              <FinHoverLift className="fin-card h-full p-5">
                <div className="flex gap-0.5 text-brand">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5" />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  “{review.quote}”
                </p>
                <p className="mt-4 text-sm font-semibold text-text-primary">{review.name}</p>
                <p className="text-xs text-text-tertiary">{review.role}</p>
              </FinHoverLift>
            </FinStaggerItem>
          ))}
        </div>
      </FinScrollStagger>
    </section>
  );
}

export function FinPlansTeaser() {
  return (
    <section className="mt-4">
      <FinScrollStagger>
        <FinStaggerItem variant="scale">
          <FinHoverLift className="fin-card p-6 sm:p-8">
            <p className="fin-section-label">Plans</p>
            <h2 className="mt-2 text-xl font-bold text-text-primary sm:text-2xl">
              Trading, signals, mining, and staking
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary">
              Choose a trading tier with leverage up to 1:500, boost signal strength, rent hashpower,
              or lock a staking term from 30 to 360 days.
            </p>
            <ul className="mt-5 grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
              {[
                "Leverage from 1:10 to 1:500",
                "Signal strength up to +100%",
                "Mining from 100 to 1000 TH/s",
                "Staking returns up to 25%",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                  {line}
                </li>
              ))}
            </ul>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="mt-6 inline-block">
              <Link
                href="/plans"
                className="fin-btn-primary inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold"
              >
                View all plans
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </FinHoverLift>
        </FinStaggerItem>
      </FinScrollStagger>
    </section>
  );
}
