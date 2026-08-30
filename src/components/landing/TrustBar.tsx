"use client";

import { Clock, Layers, Receipt, Shield } from "@/components/icons";
import { PLATFORM_HIGHLIGHTS } from "@/lib/constants";
import { Stagger, StaggerItem } from "@/components/landing/motion";

const ICONS = [Shield, Receipt, Layers, Clock] as const;

export function TrustBar() {
  return (
    <section className="fin-page-plain bg-bg-secondary border-y border-border">
      <div className="container-app py-8 sm:py-10">
        <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-x-8 sm:gap-y-6">
          {PLATFORM_HIGHLIGHTS.map((item, i) => {
            const Icon = ICONS[i];
            return (
              <StaggerItem key={item.title}>
                <div className="group flex gap-4 min-w-0 h-full p-4 rounded-2xl border border-transparent transition-all hover:border-border/80 hover:bg-bg-primary/50 hover:shadow-[var(--shadow-card)]">
                  <span className="w-11 h-11 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0 shadow-[var(--shadow-glow)] transition-transform group-hover:scale-105">
                    <Icon className="w-4 h-4 text-white" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="font-display text-sm font-semibold text-text-primary">{item.title}</p>
                    <p className="text-xs text-text-tertiary mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
