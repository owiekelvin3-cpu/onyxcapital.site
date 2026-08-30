"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@/components/icons";
import { FinPageActions } from "@/components/marketing/fin/FinMarketingShell";
import { FinStagger, FinStaggerItem } from "@/components/marketing/fin/fin-motion";

export function MarketingPageShell({
  title,
  subtitle,
  children,
  ctaHref = "/register",
  ctaLabel = "Get started for free",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-[1200px]">
      <FinStagger>
        <FinStaggerItem>
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="fin-card flex-1 p-6 sm:p-8">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl lg:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
                {subtitle}
              </p>
              <Link href={ctaHref} className="mt-6 inline-block">
                <span className="fin-btn-primary inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold">
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
            <FinPageActions />
          </div>
        </FinStaggerItem>
        <FinStaggerItem>
          <div className="fin-page-content">{children}</div>
        </FinStaggerItem>
      </FinStagger>
    </div>
  );
}
