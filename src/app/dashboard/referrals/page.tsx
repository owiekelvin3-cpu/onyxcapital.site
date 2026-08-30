"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { getAppUrl } from "@/lib/env";
import { REFERRAL_BONUS_AMOUNT, getReferralStats, type ReferralStats } from "@/lib/api/referrals";
import { DASHBOARD_REFRESH_EVENT } from "@/lib/dashboard-live-sync";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Check, Copy, Share, Users } from "@/components/icons";

export default function ReferralsPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [error, setError] = useState("");

  const referralLink = useMemo(() => {
    if (!stats?.referralCode) return "";
    return `${getAppUrl()}/register?ref=${encodeURIComponent(stats.referralCode)}`;
  }, [stats?.referralCode]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setStats(await getReferralStats(supabase, user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("referrals.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    window.addEventListener(DASHBOARD_REFRESH_EVENT, load);
    return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, load);
  }, [load]);

  async function copyText(value: string, kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError(t("referrals.copyError"));
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-text-tertiary">
        {t("common.loading")}…
      </div>
    );
  }

  return (
    <div className="decko-dashboard mx-auto max-w-3xl space-y-5 pb-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
          {t("referrals.eyebrow")}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-text-primary">{t("referrals.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">{t("referrals.subtitle")}</p>
      </div>

      {error && (
        <p className="rounded-xl border border-red/30 bg-red/10 px-4 py-3 text-sm text-red">{error}</p>
      )}

      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-brand">
            <Share className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              {t("referrals.yourId")}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-text-primary">
              {stats?.referralCode || "—"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button type="button" variant="secondary" onClick={() => void copyText(stats?.referralCode ?? "", "code")}>
            {copied === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied === "code" ? t("referrals.copied") : t("referrals.copyId")}
          </Button>
          <Button type="button" onClick={() => void copyText(referralLink, "link")}>
            {copied === "link" ? <Check className="h-4 w-4" /> : <Share className="h-4 w-4" />}
            {copied === "link" ? t("referrals.copied") : t("referrals.copyLink")}
          </Button>
        </div>

        <p className="rounded-xl border border-border/80 bg-bg-primary/60 px-3 py-2.5 text-xs text-text-tertiary break-all">
          {referralLink}
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-text-tertiary">{t("referrals.invited")}</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{stats?.inviteCount ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-tertiary">{t("referrals.earned")}</p>
          <p className="mt-1 text-2xl font-bold text-green">
            {formatCurrency(stats?.earnedTotal ?? 0)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-tertiary">{t("referrals.bonusEach")}</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">
            {formatCurrency(REFERRAL_BONUS_AMOUNT)}
          </p>
        </Card>
      </div>

      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-text-primary">{t("referrals.howItWorksTitle")}</h2>
        <ol className="mt-3 space-y-2 text-sm text-text-secondary">
          <li>{t("referrals.step1")}</li>
          <li>{t("referrals.step2")}</li>
          <li>{t("referrals.step3", { amount: formatCurrency(REFERRAL_BONUS_AMOUNT) })}</li>
        </ol>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">{t("referrals.rewardsTitle")}</h2>
        </div>
        {(stats?.rewards.length ?? 0) === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-text-tertiary">{t("referrals.rewardsEmpty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {stats?.rewards.map((reward) => (
              <li key={reward.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green/10 text-green">
                    <Users className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">{t("referrals.rewardLine")}</p>
                    <p className="text-xs text-text-tertiary">{formatDate(reward.created_at)}</p>
                  </div>
                </div>
                <p className="shrink-0 font-semibold tabular-nums text-green">
                  +{formatCurrency(Number(reward.amount))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
