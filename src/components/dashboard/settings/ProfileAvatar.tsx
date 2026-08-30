"use client";

import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Image, Loader2 } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useSettingsProfile } from "./SettingsProfileProvider";

export function ProfileAvatar({
  initials,
  displayName,
}: {
  initials: string;
  displayName: string;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const { avatarUrl, savingAvatar, avatarMessage, uploadAvatar, removeAvatar } =
    useSettingsProfile();

  return (
    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={savingAvatar}
        className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-brand/20 bg-brand/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        aria-label={t("settingsPage.avatarHint")}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-brand">
            {initials}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {savingAvatar ? (
            <Loader2 className="h-5 w-5 text-white" />
          ) : (
            <Image className="h-5 w-5 text-white" />
          )}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadAvatar(file);
          event.target.value = "";
        }}
      />

      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{displayName}</p>
        <p className="mt-1 text-xs text-text-tertiary leading-relaxed">{t("settingsPage.avatarHint")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={savingAvatar}
            onClick={() => inputRef.current?.click()}
          >
            {savingAvatar ? <Loader2 className="h-4 w-4" /> : <Image className="h-4 w-4" />}
            {t("settingsPage.changePhoto", { defaultValue: "Change photo" })}
          </Button>
          {avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={savingAvatar}
              onClick={() => void removeAvatar()}
              className="text-red hover:bg-red/5 hover:text-red"
            >
              {t("settingsPage.removeAvatar")}
            </Button>
          )}
        </div>
        {avatarMessage === "updated" && (
          <p className={cn("mt-2 text-xs text-green")}>{t("settingsPage.avatarUpdated")}</p>
        )}
        {avatarMessage === "removed" && (
          <p className={cn("mt-2 text-xs text-green")}>{t("settingsPage.avatarRemoved")}</p>
        )}
      </div>
    </div>
  );
}
