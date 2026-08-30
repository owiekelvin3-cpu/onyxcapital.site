"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2 } from "@/components/icons";
import { formatDate } from "@/lib/utils";
import { FileCheck } from "@/components/icons";
import { useSettingsProfile } from "./SettingsProfileProvider";
import { KycBadge, SettingsSection } from "./shared";
import { ProfileAvatar } from "./ProfileAvatar";

function resolveErrorMessage(error: string, t: (key: string) => string) {
  if (error === "avatarType") return t("settingsPage.avatarType");
  if (error === "avatarSize") return t("settingsPage.avatarSize");
  if (error === "saveFailed") return t("settingsPage.saveFailed");
  return error;
}

export function SettingsProfileSection({ hideHeader = false }: { hideHeader?: boolean }) {
  const { t } = useTranslation();
  const {
    loading,
    email,
    fullName,
    setFullName,
    phone,
    setPhone,
    country,
    setCountry,
    bio,
    setBio,
    kycStatus,
    memberSince,
    savingProfile,
    profileSaved,
    error,
    saveProfile,
  } = useSettingsProfile();

  const initials = useMemo(() => {
    const source = fullName.trim() || email;
    return source.charAt(0).toUpperCase() || "U";
  }, [email, fullName]);

  const kycLabel =
    kycStatus === "approved"
      ? t("dashboard.verified")
      : kycStatus === "pending"
        ? t("dashboard.kycPending")
        : kycStatus === "rejected"
          ? t("dashboard.kycRejected")
          : t("dashboard.kycNone");

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-tertiary">
        <Loader2 className="h-4 w-4" />
        {t("common.loading")}
      </div>
    );
  }

  return (
    <SettingsSection
      title={t("settingsPage.profileTitle")}
      description={t("settingsPage.profileDesc")}
      hideHeader={hideHeader}
    >
      <ProfileAvatar initials={initials} displayName={fullName || email.split("@")[0]} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <KycBadge status={kycStatus} label={kycLabel} />
        {memberSince && (
          <p className="text-xs text-text-tertiary">
            {t("settingsPage.memberSince", {
              date: formatDate(memberSince).split(",")[1]?.trim() || formatDate(memberSince),
            })}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">
          {resolveErrorMessage(error, t)}
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void saveProfile();
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="fullName"
            label={t("settingsPage.fullName")}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
          <Input id="email" label={t("settingsPage.email")} value={email} disabled />
          <Input
            id="phone"
            label={t("settingsPage.phone")}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <Input
            id="country"
            label={t("auth.country")}
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            placeholder={t("auth.countryPlaceholder")}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="bio" className="block text-xs text-text-tertiary">
            {t("settingsPage.bio")}
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={3}
            placeholder={t("settingsPage.bioPlaceholder")}
            className="w-full resize-none rounded-xl border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none"
          />
        </div>

        {kycStatus !== "approved" && (
          <div className="rounded-2xl border border-border bg-bg-primary/50 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">{t("settingsPage.identityTitle")}</p>
              <p className="text-xs text-text-tertiary mt-0.5">{t("settingsPage.identityDesc")}</p>
            </div>
            <Link href="/dashboard/kyc">
              <Button variant="outline" size="sm">
                <FileCheck className="h-4 w-4" />
                {t("settingsPage.completeKyc")}
              </Button>
            </Link>
          </div>
        )}

        <Button type="submit" disabled={savingProfile}>
          {savingProfile ? <Loader2 className="h-4 w-4" /> : null}
          {profileSaved ? t("settingsPage.profileSaved") : t("settingsPage.saveProfile")}
        </Button>
      </form>
    </SettingsSection>
  );
}
