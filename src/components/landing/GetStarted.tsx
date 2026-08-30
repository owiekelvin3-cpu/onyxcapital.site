"use client";

import Link from "next/link";
import { STEPS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { FadeUp, Stagger, StaggerItem } from "@/components/landing/motion";

const STEP_LINKS = ["/register", "/help", "/dashboard/deposit"];

export function GetStarted() {
  return (
    <section className="bg-bg-secondary py-12 sm:py-16 lg:py-20">
      <div className="container-app">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-start">
          <div>
            <FadeUp>
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary text-balance">
                Up and running in three steps
              </h2>
              <p className="text-sm text-text-tertiary mt-2">
                No sales calls. No waiting on a rep. Just sign up and trade.
              </p>
            </FadeUp>

            <Stagger className="mt-6 sm:mt-8 space-y-5 sm:space-y-6 relative">
              <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border hidden sm:block landing-step-line" aria-hidden />
              {STEPS.map((s, i) => (
                <StaggerItem key={s.step}>
                  <Link href={STEP_LINKS[i]} className="flex gap-3 sm:gap-4 group relative">
                    <span className="relative z-10 flex items-center justify-center w-6 h-6 rounded-full bg-bg-primary border border-border text-brand font-bold text-[10px] font-mono shrink-0 transition-all group-hover:border-brand group-hover:shadow-[0_0_16px_rgba(226,255,76,0.2)]">
                      {s.step.replace("0", "")}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-text-primary group-hover:text-brand transition-colors">
                        {s.title}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">{s.desc}</p>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>

            <FadeUp delay={0.2}>
              <Link href="/register" className="inline-block mt-6 sm:mt-8 w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  Create account
                </Button>
              </Link>
            </FadeUp>
          </div>

          <FadeUp delay={0.1}>
            <div className="relative bg-bg-primary border border-border rounded-lg p-5 sm:p-8 overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green/[0.04] rounded-full blur-2xl transition-opacity group-hover:opacity-150" aria-hidden />
              <h3 className="text-base font-semibold text-text-primary relative">
                Security isn&apos;t a footnote
              </h3>
              <p className="text-sm text-text-tertiary mt-2 leading-relaxed relative">
                Encryption, optional 2FA, and withdrawal checks — built into the account, not bolted on later.
              </p>
              <ul className="mt-5 sm:mt-6 space-y-3 relative">
                {[
                  "Passwords hashed — never stored in plain text",
                  "Two-factor auth in settings when you want it",
                  "Withdrawals reviewed by our team before they leave",
                  "Help center when you need a human",
                ].map((item, i) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-sm text-text-secondary landing-check-item"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <span className="text-brand shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
