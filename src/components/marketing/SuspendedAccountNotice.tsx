"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/constants";
import { useSuspendedAccount } from "@/hooks/useSuspendedAccount";
import { AlertTriangle } from "@/components/icons";

export function SuspendedAccountNotice() {
  const { t } = useTranslation();
  const { loading, suspended, reason } = useSuspendedAccount();
  const [signingOut, setSigningOut] = useState(false);

  if (loading || !suspended) return null;

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
    <section className="mb-5 rounded-2xl border border-red/25 bg-red/[0.06] p-4 sm:p-5">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red/10 text-red">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red">
            {t("accountRestricted.badge")}
          </p>
          <h2 className="mt-1 text-base font-semibold text-text-primary sm:text-lg">
            {t("accountRestricted.title")}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
            {t("accountRestricted.body")}
          </p>
          {reason && (
            <p className="mt-3 rounded-xl border border-border/80 bg-bg-primary/60 px-3 py-2 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">{t("accountRestricted.reasonLabel")}: </span>
              {reason}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-brand-text"
            >
              {t("accountRestricted.openDashboard")}
            </a>
            <a
              href={`mailto:${BRAND.supportEmail}`}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium text-text-primary hover:bg-bg-hover"
            >
              {t("accountRestricted.contact")}
            </a>
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={signingOut}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium text-text-primary hover:bg-bg-hover disabled:opacity-60"
            >
              {signingOut ? t("common.loading") : t("accountRestricted.signOut")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
