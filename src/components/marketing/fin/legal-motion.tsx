"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export function LegalHeroBackground({ variant = "terms" }: { variant?: "terms" | "privacy" }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className="legal-hero-bg pointer-events-none absolute inset-x-0 top-0 h-[520px]" aria-hidden>
        <div className="legal-mesh absolute inset-0 opacity-40" />
      </div>
    );
  }

  return (
    <div className="legal-hero-bg pointer-events-none absolute inset-x-0 top-0 h-[520px] overflow-hidden" aria-hidden>
      <div className="legal-mesh absolute inset-0" />
      <motion.div
        className="legal-orb legal-orb-a absolute -left-20 top-8 h-80 w-80 rounded-full"
        animate={{ x: [0, 32, 0], y: [0, -24, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="legal-orb legal-orb-b absolute -right-12 top-24 h-64 w-64 rounded-full"
        animate={{ x: [0, -28, 0], y: [0, 18, 0], scale: [1, 1.14, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      />
      <motion.div
        className="legal-orb legal-orb-c absolute left-[42%] top-[38%] h-48 w-48 rounded-full"
        animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.85, 1.2, 0.85] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />
      {variant === "privacy" && (
        <motion.div
          className="legal-shield-ring absolute left-1/2 top-28 h-56 w-56 -translate-x-1/2 rounded-full border border-[var(--brand-accent)]/20"
          animate={{ rotate: 360, scale: [1, 1.05, 1] }}
          transition={{ rotate: { duration: 28, repeat: Infinity, ease: "linear" }, scale: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
        />
      )}
      <motion.div
        className="legal-scanline absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand-accent)]/50 to-transparent"
        animate={{ y: [0, 520], opacity: [0, 0.8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
      />
      <div className="legal-grain absolute inset-0 opacity-[0.035]" />
    </div>
  );
}

export function LegalScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });

  if (reduce) return null;

  return (
    <motion.div
      className="legal-progress fixed left-0 right-0 top-0 z-50 h-[3px] origin-left bg-[var(--brand-accent)]"
      style={{ scaleX }}
      aria-hidden
    />
  );
}

export function LegalHeroTitle({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <h1 className="legal-hero-title">{children}</h1>;

  return (
    <motion.h1
      className="legal-hero-title"
      initial={{ opacity: 0, y: 36, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.85, ease }}
    >
      {children}
    </motion.h1>
  );
}

export function LegalHeroMeta({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <div>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15, ease }}
    >
      {children}
    </motion.div>
  );
}

export function LegalFactPill({
  label,
  value,
  index,
}: {
  label: string;
  value: string;
  index: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div className="legal-fact-pill">
        <span className="text-[11px] uppercase tracking-wider text-text-tertiary">{label}</span>
        <span className="mt-1 block text-sm font-semibold text-text-primary">{value}</span>
      </div>
    );
  }

  return (
    <motion.div
      className="legal-fact-pill"
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.25 + index * 0.08, ease }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      <span className="text-[11px] uppercase tracking-wider text-text-tertiary">{label}</span>
      <span className="mt-1 block text-sm font-semibold text-text-primary">{value}</span>
    </motion.div>
  );
}

export function LegalSectionCard({
  id,
  index,
  title,
  summary,
  children,
}: {
  id: string;
  index: number;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  if (reduce) {
    return (
      <section id={id} ref={ref} className="legal-section-card">
        <div className="legal-section-index">{String(index + 1).padStart(2, "0")}</div>
        <div>
          <h2 className="legal-section-title">{title}</h2>
          <p className="legal-section-summary">{summary}</p>
          <div className="legal-section-body">{children}</div>
        </div>
      </section>
    );
  }

  return (
    <motion.section
      id={id}
      ref={ref}
      className="legal-section-card"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay: (index % 3) * 0.05, ease }}
    >
      <motion.div
        className="legal-section-index"
        initial={{ scale: 0.6, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.1 }}
      >
        {String(index + 1).padStart(2, "0")}
      </motion.div>
      <div>
        <h2 className="legal-section-title">{title}</h2>
        <p className="legal-section-summary">{summary}</p>
        <motion.div
          className="legal-section-body"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
          }}
        >
          {children}
        </motion.div>
      </div>
    </motion.section>
  );
}

export function LegalParagraph({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <p className="legal-paragraph">{children}</p>;

  return (
    <motion.p
      className="legal-paragraph"
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.45, ease } },
      }}
    >
      {children}
    </motion.p>
  );
}

export function LegalBulletList({ items }: { items: string[] }) {
  const reduce = useReducedMotion();

  return (
    <ul className="legal-bullet-list">
      {items.map((item, i) => (
        <li key={i}>
          {reduce ? (
            item
          ) : (
            <motion.span
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.05 + i * 0.04, ease }}
            >
              {item}
            </motion.span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function LegalHighlight({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className="legal-highlight">{children}</div>;

  return (
    <motion.div
      className="legal-highlight"
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease }}
    >
      <motion.div
        className="legal-highlight-glow"
        animate={{ opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      {children}
    </motion.div>
  );
}

export function LegalToc({
  sections,
  activeId,
  onNavigate,
}: {
  sections: { id: string; title: string }[];
  activeId: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <nav className="legal-toc" aria-label="Table of contents">
      <p className="legal-toc-label">On this page</p>
      <ul>
        {sections.map((section) => {
          const active = activeId === section.id;
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onNavigate(section.id)}
                className={active ? "legal-toc-link legal-toc-link-active" : "legal-toc-link"}
              >
                {active && <span className="legal-toc-indicator" aria-hidden />}
                {section.title.replace(/^\d+\.\s*/, "")}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function useLegalScrollSpy(sectionIds: string[]) {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? "");

  useEffect(() => {
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
}

export function LegalParallaxBadge({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [24, -24]);

  if (reduce) return <div className="legal-badge">{children}</div>;

  return (
    <motion.div ref={ref} className="legal-badge" style={{ y }}>
      {children}
    </motion.div>
  );
}

export function LegalCtaBanner({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className="legal-cta">{children}</div>;

  return (
    <motion.div
      className="legal-cta"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease }}
    >
      <motion.div
        className="legal-cta-shimmer"
        animate={{ x: ["-120%", "220%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear", repeatDelay: 3 }}
        aria-hidden
      />
      {children}
    </motion.div>
  );
}
