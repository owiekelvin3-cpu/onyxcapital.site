"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { SIGNAL_PLANS } from "@/lib/signal-plans";
import { cn } from "@/lib/utils";

const TIER_COLOR: Record<string, string> = {
  newbie: "#64748b",
  bronze: "#c0843c",
  silver: "#94a3b8",
  gold: "#eab308",
  platinum: "#818cf8",
};

export function SignalStrengthCard({
  planId,
  planName,
  expiresAt,
  compact = false,
}: {
  planId?: string | null;
  planName?: string | null;
  expiresAt?: string | null;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const activeId = planId?.toLowerCase() ?? "";
  const hasPlan = Boolean(planName);
  const accent = TIER_COLOR[activeId] ?? "var(--green)";

  let daysLeft: number | null = null;
  if (expiresAt) {
    daysLeft = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
  }

  return (
    <div className={cn("decko-card relative overflow-hidden", compact ? "p-4" : "p-5")}>
      <p className="text-sm font-medium text-text-secondary">{t("signals.currentPlan")}</p>
      <p
        className={cn(
          "mt-2 font-bold tracking-wide text-text-primary",
          compact ? "text-2xl" : "text-3xl"
        )}
        style={hasPlan ? { color: accent } : undefined}
      >
        {planName ?? t("signals.noPlan")}
      </p>
      <p className="mt-1 text-xs text-text-tertiary">
        {hasPlan
          ? daysLeft !== null
            ? t("signals.daysLeft", { count: daysLeft })
            : t("signals.planActive")
          : t("signals.noPlanHint")}
      </p>

      <div className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-1", compact ? "mt-3" : "mt-4")}>
        {SIGNAL_PLANS.map((plan, index) => {
          const current = plan.id === activeId;
          return (
            <span key={plan.id} className="inline-flex items-center gap-1.5">
              {index > 0 && <span className="text-text-tertiary/60">—</span>}
              <span
                className={cn(
                  "text-[11px] font-bold tracking-wide",
                  current ? "text-text-primary" : "text-text-tertiary"
                )}
                style={current ? { color: accent } : undefined}
              >
                {plan.name}
              </span>
            </span>
          );
        })}
      </div>

      <Link
        href="/dashboard/signals"
        className="mt-4 inline-flex text-xs font-semibold text-green hover:underline"
      >
        {hasPlan ? t("signals.viewPackages") : t("signals.choosePackage")}
      </Link>
    </div>
  );
}
