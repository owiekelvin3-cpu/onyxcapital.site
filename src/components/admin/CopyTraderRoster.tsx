"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Image, Loader2, Pencil, Plus, Trash, Upload } from "@/components/icons";
import { TraderAvatar } from "@/components/dashboard/copy-trading/TraderAvatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import {
  createCopyTrader,
  deleteCopyTrader,
  updateCopyTrader,
  type CopyTraderInput,
} from "@/lib/api/copy-traders";
import {
  COPY_TRADER_SECTION_META,
  TRADER_AVATAR_KINDS,
  isRemoteAvatarUrl,
  sectionTitle,
  slugFromName,
  type CopyTraderProfile,
  type TraderAvatarKind,
} from "@/lib/copy-traders";
import { formatCurrency } from "@/lib/utils";

const emptyDraft = (): CopyTraderInput => ({
  name: "",
  handle: "",
  bio: "",
  roi: 50,
  followers: 0,
  winRate: 70,
  rating: 4.5,
  avatarKind: "illustrated",
  avatarSeed: "",
  ringColor: "#6366f1",
  verified: false,
  badge: "",
  sectionId: "featured",
  sortOrder: 0,
  price: 99,
  isActive: true,
});

function profileToInput(trader: CopyTraderProfile): CopyTraderInput {
  return {
    name: trader.name,
    handle: trader.handle,
    bio: trader.bio,
    roi: trader.roi,
    followers: trader.followers,
    winRate: trader.winRate,
    rating: trader.rating,
    avatarKind: trader.avatarKind,
    avatarSeed: trader.avatarSeed,
    ringColor: trader.ringColor,
    verified: Boolean(trader.verified),
    badge: trader.badge ?? "",
    sectionId: trader.sectionId,
    sortOrder: trader.sortOrder ?? 0,
    price: trader.price,
    isActive: trader.isActive !== false,
  };
}

function FieldSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs text-text-tertiary">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded border border-border bg-bg-primary px-3 text-sm text-text-primary focus:border-brand focus:outline-none"
      >
        {children}
      </select>
    </div>
  );
}

export function CopyTraderRoster({
  traders,
  onChange,
  onError,
  onSuccess,
}: {
  traders: CopyTraderProfile[];
  onChange: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CopyTraderInput>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const previewTrader: CopyTraderProfile = {
    name: draft.name.trim() || "Trader",
    handle: draft.handle,
    bio: draft.bio,
    roi: Number(draft.roi) || 0,
    followers: Number(draft.followers) || 0,
    winRate: Number(draft.winRate) || 0,
    rating: Number(draft.rating) || 0,
    avatarKind: draft.avatarKind,
    avatarSeed: draft.avatarSeed || slugFromName(draft.name || "trader"),
    ringColor: draft.ringColor,
    price: Number(draft.price) || 0,
    sectionId: draft.sectionId,
  };

  const grouped = useMemo(() => {
    const map = new Map<string, CopyTraderProfile[]>();
    for (const trader of traders) {
      const key = trader.sectionId || "featured";
      const list = map.get(key) ?? [];
      list.push(trader);
      map.set(key, list);
    }
    return map;
  }, [traders]);

  const setField = <K extends keyof CopyTraderInput>(key: K, value: CopyTraderInput[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !editingId) {
        const slug = slugFromName(String(value));
        if (!prev.handle || prev.handle === `@${slugFromName(prev.name)}`) {
          next.handle = `@${slug}`;
        }
        if (
          prev.avatarKind !== "photo" &&
          (!prev.avatarSeed || prev.avatarSeed === slugFromName(prev.name))
        ) {
          next.avatarSeed = slug;
        }
      }
      return next;
    });
  };

  const setAvatarKind = (kind: TraderAvatarKind) => {
    setDraft((prev) => {
      const next = { ...prev, avatarKind: kind };
      if (kind === "photo") {
        if (!isRemoteAvatarUrl(prev.avatarSeed)) next.avatarSeed = "";
      } else if (prev.avatarKind === "photo") {
        next.avatarSeed = slugFromName(prev.name);
      }
      return next;
    });
  };

  const uploadPhoto = async (file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      onError(t("admin.copyTradingPhotoType"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onError(t("admin.copyTradingPhotoSize"));
      return;
    }

    setUploadingPhoto(true);
    onError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(t("admin.copyTradingPhotoUploadFailed"));

      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const dedicatedPath = `copy-traders/${fileName}`;
      const userPath = `${user.id}/copy-traders/${fileName}`;

      let uploadedPath = dedicatedPath;
      const first = await supabase.storage
        .from("avatars")
        .upload(dedicatedPath, file, { upsert: false, contentType: file.type });
      if (first.error) {
        const retry = await supabase.storage
          .from("avatars")
          .upload(userPath, file, { upsert: false, contentType: file.type });
        if (retry.error) throw retry.error;
        uploadedPath = userPath;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(uploadedPath);

      setDraft((prev) => ({
        ...prev,
        avatarKind: "photo",
        avatarSeed: `${publicUrl}?t=${Date.now()}`,
      }));
    } catch (err) {
      onError(err instanceof Error ? err.message : t("admin.copyTradingPhotoUploadFailed"));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const resetForm = () => {
    setDraft(emptyDraft());
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (trader: CopyTraderProfile) => {
    setDraft(profileToInput(trader));
    setEditingId(trader.id ?? null);
    setShowForm(true);
  };

  const save = async () => {
    const name = draft.name.trim();
    const price = Number(draft.price);
    if (name.length < 2) {
      onError(t("admin.copyTradingNameRequired"));
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      onError(t("admin.copyTradingPriceRequired"));
      return;
    }
    if (draft.avatarKind === "photo" && !isRemoteAvatarUrl(draft.avatarSeed)) {
      onError(t("admin.copyTradingPhotoRequired"));
      return;
    }
    const rating = Number(draft.rating);
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      onError(t("admin.copyTradingRatingRange"));
      return;
    }
    const winRate = Number(draft.winRate);
    if (!Number.isFinite(winRate) || winRate < 0 || winRate > 100) {
      onError(t("admin.copyTradingWinRateRange"));
      return;
    }

    setBusy(true);
    onError("");
    try {
      const supabase = createClient();
      const payload: CopyTraderInput = {
        ...draft,
        name,
        price,
        roi: Number(draft.roi) || 0,
        followers: Number(draft.followers) || 0,
        winRate: Number(draft.winRate) || 0,
        rating: Math.min(5, Math.max(0, Number(draft.rating) || 0)),
        sortOrder: Number(draft.sortOrder) || 0,
        avatarSeed:
          draft.avatarKind === "photo"
            ? draft.avatarSeed.trim()
            : draft.avatarSeed.trim() || slugFromName(name),
      };
      const persist = (input: CopyTraderInput) =>
        editingId ? updateCopyTrader(supabase, editingId, input) : createCopyTrader(supabase, input);
      try {
        await persist(payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (payload.avatarKind === "photo" && /avatar_kind/i.test(message)) {
          await persist({ ...payload, avatarKind: "illustrated" });
        } else {
          throw err;
        }
      }
      onSuccess(t("admin.copyTradingTraderSaved"));
      resetForm();
      await onChange();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("admin.copyTradingPriceRequired");
      if (/copy_traders_rating_check|rating_check/i.test(message)) {
        onError(t("admin.copyTradingRatingRange"));
      } else if (/copy_traders_win_rate|win_rate_check/i.test(message)) {
        onError(t("admin.copyTradingWinRateRange"));
      } else {
        onError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (trader: CopyTraderProfile) => {
    if (!trader.id) return;
    const ok = window.confirm(t("admin.copyTradingRemoveConfirm", { name: trader.name }));
    if (!ok) return;
    setRemovingId(trader.id);
    onError("");
    try {
      const supabase = createClient();
      await deleteCopyTrader(supabase, trader.id);
      onSuccess(t("admin.copyTradingTraderRemoved", { name: trader.name }));
      if (editingId === trader.id) resetForm();
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : t("admin.copyTradingRemoveTrader"));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-secondary/40">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-text-primary">{t("admin.copyTradingRoster")}</h2>
        <Button
          type="button"
          size="sm"
          variant={showForm && !editingId ? "secondary" : "brand"}
          onClick={() => {
            if (showForm && !editingId) {
              resetForm();
              return;
            }
            setDraft(emptyDraft());
            setEditingId(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          {t("admin.copyTradingAddTrader")}
        </Button>
      </div>

      {showForm && (
        <div className="border-b border-border bg-bg-primary/40 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label={t("admin.copyTradingFieldName")}
              value={draft.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="AlphaTrader"
            />
            <Input
              label={t("admin.copyTradingFieldHandle")}
              value={draft.handle}
              onChange={(e) => setField("handle", e.target.value)}
              placeholder="@alpha.fx"
            />
            <Input
              label={t("admin.copyTradingFieldPrice")}
              type="number"
              min={0.01}
              step="0.01"
              value={draft.price}
              onChange={(e) => setField("price", Number(e.target.value))}
            />
            <FieldSelect
              id="copy-section"
              label={t("admin.copyTradingFieldSection")}
              value={draft.sectionId}
              onChange={(value) => setField("sectionId", value)}
            >
              {COPY_TRADER_SECTION_META.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </FieldSelect>
            <div className="sm:col-span-2 lg:col-span-4">
              <Input
                label={t("admin.copyTradingFieldBio")}
                value={draft.bio}
                onChange={(e) => setField("bio", e.target.value)}
                placeholder="Momentum scalper · BTC & ETH focus"
              />
            </div>
            <Input
              label={t("admin.copyTradingFieldRoi")}
              type="number"
              step="0.1"
              value={draft.roi}
              onChange={(e) => setField("roi", Number(e.target.value))}
            />
            <Input
              label={t("admin.copyTradingFieldWinRate")}
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={draft.winRate}
              onChange={(e) => {
                const next = Number(e.target.value);
                setField("winRate", Number.isFinite(next) ? Math.min(100, Math.max(0, next)) : 0);
              }}
            />
            <Input
              label={t("admin.copyTradingFieldFollowers")}
              type="number"
              min={0}
              value={draft.followers}
              onChange={(e) => setField("followers", Number(e.target.value))}
            />
            <Input
              label={t("admin.copyTradingFieldRating")}
              type="number"
              min={0}
              max={5}
              step="0.1"
              value={draft.rating}
              onChange={(e) => {
                const next = Number(e.target.value);
                setField("rating", Number.isFinite(next) ? Math.min(5, Math.max(0, next)) : 0);
              }}
            />
            <Input
              label={t("admin.copyTradingFieldBadge")}
              value={draft.badge}
              onChange={(e) => setField("badge", e.target.value)}
              placeholder="Pro"
            />
            <FieldSelect
              id="copy-avatar"
              label={t("admin.copyTradingFieldAvatar")}
              value={draft.avatarKind}
              onChange={(value) => setAvatarKind(value as TraderAvatarKind)}
            >
              {TRADER_AVATAR_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind === "photo" ? t("admin.copyTradingAvatarFromDevice") : kind}
                </option>
              ))}
            </FieldSelect>
            {draft.avatarKind === "photo" ? (
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                <p className="block text-xs text-text-tertiary">{t("admin.copyTradingUploadPhoto")}</p>
                <div className="flex items-center gap-3">
                  {isRemoteAvatarUrl(draft.avatarSeed) ? (
                    <TraderAvatar trader={previewTrader} size="lg" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-bg-primary text-text-tertiary"
                      aria-label={t("admin.copyTradingUploadPhoto")}
                    >
                      {uploadingPhoto ? <Loader2 className="h-5 w-5" /> : <Image className="h-5 w-5" />}
                    </button>
                  )}
                  <div className="min-w-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={uploadingPhoto}
                      onClick={() => photoInputRef.current?.click()}
                    >
                      {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
                      {isRemoteAvatarUrl(draft.avatarSeed)
                        ? t("admin.copyTradingChangePhoto")
                        : t("admin.copyTradingUploadPhoto")}
                    </Button>
                    <p className="mt-1 text-xs text-text-tertiary">{t("admin.copyTradingPhotoHint")}</p>
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadPhoto(file);
                      event.target.value = "";
                    }}
                  />
                </div>
              </div>
            ) : (
              <Input
                label={t("admin.copyTradingFieldSeed")}
                value={draft.avatarSeed}
                onChange={(e) => setField("avatarSeed", e.target.value)}
              />
            )}
            <Input
              label={t("admin.copyTradingFieldColor")}
              value={draft.ringColor}
              onChange={(e) => setField("ringColor", e.target.value)}
            />
            <Input
              label={t("admin.copyTradingFieldSort")}
              type="number"
              value={draft.sortOrder}
              onChange={(e) => setField("sortOrder", Number(e.target.value))}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={draft.verified}
                onChange={(e) => setField("verified", e.target.checked)}
              />
              {t("admin.copyTradingFieldVerified")}
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => setField("isActive", e.target.checked)}
              />
              {t("admin.copyTradingFieldActive")}
            </label>
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={resetForm} disabled={busy}>
                {t("admin.copyTradingCancelEdit")}
              </Button>
              <Button type="button" size="sm" onClick={() => void save()} disabled={busy || uploadingPhoto}>
                {editingId ? t("admin.copyTradingEditTrader") : t("admin.copyTradingAddTrader")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {traders.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-tertiary">{t("admin.copyTradingRosterEmpty")}</p>
      ) : (
        <div className="divide-y divide-border">
          {COPY_TRADER_SECTION_META.map((section) => {
            const rows = grouped.get(section.id) ?? [];
            if (rows.length === 0) return null;
            return (
              <div key={section.id}>
                <p className="bg-bg-primary/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  {section.title}
                </p>
                {rows.map((trader) => (
                  <div
                    key={trader.id ?? trader.name}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <TraderAvatar trader={trader} size="sm" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-text-primary">{trader.name}</p>
                          <span className="text-xs text-text-tertiary">{trader.handle}</span>
                          {!trader.isActive && (
                            <span className="rounded-full bg-bg-tertiary px-2 py-0.5 text-[10px] font-semibold uppercase text-text-tertiary">
                              Hidden
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-text-tertiary">{trader.bio}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <p className="text-sm font-semibold tabular-nums text-text-primary">
                        {formatCurrency(trader.price)}
                      </p>
                      <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(trader)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="!text-red"
                        disabled={removingId === trader.id}
                        onClick={() => void remove(trader)}
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {[...grouped.keys()]
            .filter((id) => !COPY_TRADER_SECTION_META.some((s) => s.id === id))
            .map((id) => (
              <div key={id}>
                <p className="bg-bg-primary/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  {sectionTitle(id)}
                </p>
                {(grouped.get(id) ?? []).map((trader) => (
                  <div
                    key={trader.id ?? trader.name}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="font-medium text-text-primary">{trader.name}</p>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold">{formatCurrency(trader.price)}</p>
                      <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(trader)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="!text-red"
                        onClick={() => void remove(trader)}
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
