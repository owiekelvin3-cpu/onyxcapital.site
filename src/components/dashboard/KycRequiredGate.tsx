"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { getKycStatus, isKycApproved, type KycStatus } from "@/lib/kyc";
import { FileCheck } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { Loader2 } from "@/components/icons";

export function KycRequiredGate({
  children,
  className,
  compact,
}: {
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<KycStatus | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setStatus("none");
        return;
      }
      const { data } = await supabase.from("profiles").select("kyc_status").eq("id", user.id).single();
      setStatus(getKycStatus(data));
    });
  }, []);

  if (status === null) {
    return (
      <div className={cn("flex justify-center py-12", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (isKycApproved({ kyc_status: status })) return <>{children}</>;

  const title =
    status === "pending"
      ? t("kyc.gatePendingTitle")
      : status === "rejected"
        ? t("kyc.gateRejectedTitle")
        : t("kyc.gateTitle");
  const desc =
    status === "pending"
      ? t("kyc.gatePendingDesc")
      : status === "rejected"
        ? t("kyc.gateRejectedDesc")
        : t("kyc.gateDesc");

  const body = (
    <div className={cn("mx-auto flex max-w-lg flex-col items-center text-center", compact ? "py-4" : "py-6 sm:py-8")}>
      <div
        className={cn(
          "mb-4 flex items-center justify-center rounded-2xl bg-brand/10 text-brand",
          compact ? "h-11 w-11" : "h-14 w-14"
        )}
      >
        <FileCheck className={compact ? "h-5 w-5" : "h-7 w-7"} />
      </div>
      <h2 className={cn("font-semibold text-text-primary", compact ? "text-base" : "text-xl")}>{title}</h2>
      <p className={cn("mt-2 leading-relaxed text-text-tertiary", compact ? "text-xs" : "text-sm")}>{desc}</p>
      <Link href="/dashboard/kyc" className="mt-5">
        <Button size={compact ? "sm" : "md"}>
          <FileCheck className="h-4 w-4" />
          {status === "pending" ? t("kyc.gateViewStatus") : t("kyc.gateCta")}
        </Button>
      </Link>
    </div>
  );

  if (compact) {
    return (
      <div className={cn("rounded-2xl border border-border bg-bg-secondary p-4", className)}>{body}</div>
    );
  }

  return <Card className={cn("p-4 sm:p-6", className)}>{body}</Card>;
}
