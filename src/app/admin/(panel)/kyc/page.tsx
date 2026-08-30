"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { createKycDocumentSignedUrl } from "@/lib/kyc";
import { updateKycStatus } from "@/lib/admin-api";
import type { KycRow } from "@/lib/admin-types";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card, Button } from "@/components/ui";
import {
  Camera,
  CheckCircle,
  ChevronDown,
  Clock,
  ExternalLink,
  FileCheck,
  ImageIcon,
  Loader2,
  RefreshCw,
  X,
} from "@/components/icons";
import { formatDate, cn } from "@/lib/utils";

type Filter = "all" | "pending" | "approved" | "rejected";

function docTypeLabel(type: string, t: (key: string) => string) {
  const key = `admin.kycDocType.${type}`;
  const labeled = t(key);
  return labeled === key ? type.replace(/_/g, " ") : labeled;
}

function isImagePath(path: string | null) {
  if (!path) return false;
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(path) || !/\.pdf(\?|$)/i.test(path);
}

function KycPreview({
  label,
  path,
  emptyLabel,
  openLabel,
  loadingLabel,
  onOpen,
  opening,
}: {
  label: string;
  path: string | null;
  emptyLabel: string;
  openLabel: string;
  loadingLabel: string;
  onOpen: () => void;
  opening: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    if (!path || !isImagePath(path)) return;

    void createKycDocumentSignedUrl(path, 300).then((signed) => {
      if (!cancelled) setUrl(signed);
    });

    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!path) {
    return (
      <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-bg-secondary px-4 text-center">
        <ImageIcon className="h-6 w-6 text-text-tertiary" />
        <p className="text-xs text-text-tertiary">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-secondary">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">{label}</p>
        <button
          type="button"
          onClick={onOpen}
          disabled={opening}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-green hover:underline disabled:opacity-60"
        >
          <ExternalLink className="h-3 w-3" />
          {opening ? loadingLabel : openLabel}
        </button>
      </div>
      <div className="relative aspect-[4/3] bg-[#0b0c0e]">
        {url && !failed ? (
          <img
            src={url}
            alt=""
            className="h-full w-full object-contain"
            onError={() => setFailed(true)}
          />
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-text-tertiary transition-colors hover:bg-white/[0.03] hover:text-text-primary"
          >
            <FileCheck className="h-7 w-7 text-green" />
            <span className="text-xs font-medium">{opening ? loadingLabel : openLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminKycPage() {
  const { t } = useTranslation();
  const [submissions, setSubmissions] = useState<KycRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("kyc_submissions")
      .select("*, profiles(email, full_name, kyc_status)")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setSubmissions((data as KycRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = useMemo(
    () => submissions.filter((s) => s.status === "pending").length,
    [submissions]
  );

  const filtered = useMemo(
    () =>
      submissions.filter((s) => {
        if (filter === "all") return true;
        return s.status === filter;
      }),
    [submissions, filter]
  );

  const updateStatus = async (id: string, userId: string, status: "approved" | "rejected") => {
    setActing(id);
    setError("");
    try {
      await updateKycStatus(id, userId, status);
      await load();
      setExpandedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
    setActing(null);
  };

  const openAsset = async (id: string, path: string | null, kind: "doc" | "face") => {
    if (!path) return;
    const key = `${id}-${kind}`;
    setOpeningKey(key);
    setError("");
    try {
      const url = await createKycDocumentSignedUrl(path, 180);
      if (!url) {
        setError(`${t("admin.viewDocument")} unavailable`);
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open document");
    } finally {
      setOpeningKey(null);
    }
  };

  const filters: { id: Filter; label: string }[] = [
    { id: "pending", label: t("admin.filterPending") },
    { id: "all", label: t("admin.filterAll") },
    { id: "approved", label: t("admin.filterApproved") },
    { id: "rejected", label: t("admin.filterRejected") },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader
        title={t("admin.kycTitle")}
        subtitle={t("admin.kycSubtitle")}
        notificationCount={pendingCount}
        action={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            {t("admin.refresh")}
          </Button>
        }
      />

      {error && (
        <p className="rounded-lg border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">{error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="!py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
            {t("admin.filterPending")}
          </p>
          <p className="mt-1 text-2xl font-semibold text-brand">{pendingCount}</p>
        </Card>
        <Card className="!py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
            {t("admin.filterApproved")}
          </p>
          <p className="mt-1 text-2xl font-semibold text-green">
            {submissions.filter((s) => s.status === "approved").length}
          </p>
        </Card>
        <Card className="!py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
            {t("admin.filterRejected")}
          </p>
          <p className="mt-1 text-2xl font-semibold text-red">
            {submissions.filter((s) => s.status === "rejected").length}
          </p>
        </Card>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-semibold text-text-primary">{t("admin.pendingSubmissions")}</h2>
            {pendingCount > 0 && (
              <p className="mt-0.5 text-sm text-text-tertiary">
                {t("admin.pendingKycCount", { count: pendingCount })}
              </p>
            )}
          </div>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-border bg-bg-secondary p-1 scrollbar-none">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "min-h-9 shrink-0 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                  filter === f.id ? "bg-brand/10 text-green" : "text-text-tertiary hover:text-text-primary"
                )}
              >
                {f.label}
                {f.id === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 text-text-tertiary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-secondary text-text-tertiary">
              <FileCheck className="h-5 w-5" />
            </span>
            <p className="text-sm text-text-tertiary">
              {submissions.length === 0 ? t("admin.noKyc") : t("admin.noKycFiltered")}
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-4 sm:p-5">
            {filtered.map((s) => {
              const expanded = expandedId === s.id;
              const name = s.profiles?.full_name || s.profiles?.email || s.user_id;
              const email = s.profiles?.email;

              return (
                <div
                  key={s.id}
                  className={cn(
                    "overflow-hidden rounded-2xl border transition-colors",
                    s.status === "pending"
                      ? "border-brand/25 bg-brand/[0.03]"
                      : "border-border bg-bg-secondary"
                  )}
                >
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-text-primary">{name}</p>
                        <StatusBadge status={s.status} />
                      </div>
                      {email && name !== email && (
                        <p className="mt-0.5 truncate text-xs text-text-tertiary">{email}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
                        <span className="inline-flex items-center gap-1.5">
                          <FileCheck className="h-3.5 w-3.5 text-green" />
                          {docTypeLabel(s.document_type, t)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(s.created_at)}
                        </span>
                        {s.selfie_url && (
                          <span className="inline-flex items-center gap-1.5 text-green">
                            <Camera className="h-3.5 w-3.5" />
                            {t("admin.faceVerified")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setExpandedId(expanded ? null : s.id)}
                      >
                        <ChevronDown
                          className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
                        />
                        {expanded ? t("admin.hideDetails") : t("admin.viewDetails")}
                      </Button>
                      {s.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            disabled={acting === s.id}
                            onClick={() => void updateStatus(s.id, s.user_id, "approved")}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            {t("admin.approve")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={acting === s.id}
                            onClick={() => void updateStatus(s.id, s.user_id, "rejected")}
                            className="border-red/30 text-red hover:bg-red/10"
                          >
                            <X className="h-3.5 w-3.5" />
                            {t("admin.reject")}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-border bg-bg-secondary/40 px-4 py-4">
                      <p className="mb-3 text-xs leading-relaxed text-text-tertiary">
                        {t("admin.kycCompareHint")}
                      </p>
                      <div className="grid gap-3 lg:grid-cols-2">
                        <KycPreview
                          label={t("admin.kycDocLabel")}
                          path={s.document_url}
                          emptyLabel={t("admin.kycNoDoc")}
                          openLabel={t("admin.kycOpenFull")}
                          loadingLabel={t("common.loading")}
                          opening={openingKey === `${s.id}-doc`}
                          onOpen={() => void openAsset(s.id, s.document_url, "doc")}
                        />
                        <KycPreview
                          label={t("admin.kycSelfieLabel")}
                          path={s.selfie_url ?? null}
                          emptyLabel={t("admin.kycNoSelfie")}
                          openLabel={t("admin.kycOpenFull")}
                          loadingLabel={t("common.loading")}
                          opening={openingKey === `${s.id}-face`}
                          onOpen={() => void openAsset(s.id, s.selfie_url ?? null, "face")}
                        />
                      </div>

                      <div className="mt-4 grid gap-2 rounded-2xl border border-border bg-bg-secondary p-3 text-xs text-text-tertiary sm:grid-cols-3">
                        <div>
                          <p className="font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                            {t("admin.kycSubmittedAt")}
                          </p>
                          <p className="mt-1 text-text-primary">{formatDate(s.created_at)}</p>
                        </div>
                        <div>
                          <p className="font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                            {t("admin.method")}
                          </p>
                          <p className="mt-1 capitalize text-text-primary">
                            {docTypeLabel(s.document_type, t)}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                            {t("admin.kycFaceAt")}
                          </p>
                          <p className="mt-1 text-text-primary">
                            {s.face_captured_at ? formatDate(s.face_captured_at) : "—"}
                          </p>
                        </div>
                      </div>

                      {s.status === "pending" && (
                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={acting === s.id}
                            onClick={() => void updateStatus(s.id, s.user_id, "rejected")}
                            className="border-red/30 text-red hover:bg-red/10"
                          >
                            {t("admin.reject")}
                          </Button>
                          <Button
                            size="sm"
                            disabled={acting === s.id}
                            onClick={() => void updateStatus(s.id, s.user_id, "approved")}
                          >
                            {t("admin.approve")}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
