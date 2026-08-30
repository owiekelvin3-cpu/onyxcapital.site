"use client";

import { TESTIMONIALS } from "@/lib/constants";
import { FadeUp, Stagger, StaggerItem } from "@/components/landing/motion";
import { Star } from "@/components/icons";

export function TestimonialsSection() {
  return (
    <section className="fin-page-plain py-16 sm:py-24 bg-bg-primary">
      <div className="container-app">
        <FadeUp className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand mb-3">
            Client stories
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-text-primary">
            Trusted by traders who demand more
          </h2>
        </FadeUp>

        <Stagger className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((item) => (
            <StaggerItem key={item.name}>
              <figure className="h-full rounded-2xl border border-border bg-bg-secondary p-6 sm:p-7 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-premium)] transition-shadow duration-300">
                <div className="flex gap-0.5 text-gold mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <blockquote className="text-sm text-text-secondary leading-relaxed">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 pt-5 border-t border-border">
                  <p className="text-sm font-semibold text-text-primary">{item.name}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{item.role}</p>
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
