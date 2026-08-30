"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { getKycStatus, type KycStatus } from "@/lib/kyc";
import { KycWizard } from "@/components/kyc/KycWizard";
import { Loader2 } from "@/components/icons";

export default function KycPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<KycStatus>("none");
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    setUserId(user.id);
    const { data } = await supabase.from("profiles").select("kyc_status").eq("id", user.id).single();
    setKycStatus(getKycStatus(data));
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 text-text-tertiary" />
      </div>
    );
  }

  if (!userId) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
          {t("dashboard.navGroupAccount")}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-text-primary">{t("dashboard.kyc")}</h1>
        <p className="mt-1 text-sm text-text-tertiary">{t("kyc.subtitle")}</p>
      </header>

      <KycWizard userId={userId} kycStatus={kycStatus} onComplete={() => void loadProfile()} />
    </div>
  );
}
