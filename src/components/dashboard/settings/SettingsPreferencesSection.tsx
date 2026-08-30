"use client";

import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LANGUAGES } from "@/components/i18n/LanguageSelector";
import i18n, { ensureLocaleLoaded, type SupportedLanguage } from "@/i18n";
import { Loader2 } from "@/components/icons";
import { useSettingsProfile } from "./SettingsProfileProvider";
import { SettingsRow, SettingsSection } from "./shared";

const CURRENCY_CODES = ["USD", "EUR", "GBP", "AUD", "CAD", "CHF", "JPY", "AED", "SGD", "HKD"] as const;

export function SettingsPreferencesSection({ hideHeader = false }: { hideHeader?: boolean }) {
  const { t, i18n: i18nInstance } = useTranslation();
  const {
    preferredCurrency,
    savingCurrency,
    currencySaved,
    saveCurrency,
  } = useSettingsProfile();

  const locale = (i18nInstance.language?.split("-")[0] || "en") as SupportedLanguage;

  async function handleLanguageChange(code: SupportedLanguage) {
    await ensureLocaleLoaded(code);
    await i18n.changeLanguage(code);
  }

  return (
    <SettingsSection
      title={t("settingsPage.preferencesTitle")}
      description={t("settingsPage.preferencesDesc")}
      hideHeader={hideHeader}
    >
      <SettingsRow title={t("settingsPage.theme")} description={t("settingsPage.themeDesc")}>
        <ThemeToggle variant="segmented" />
      </SettingsRow>

      <SettingsRow title={t("settingsPage.language")} description={t("settingsPage.languageDesc")}>
        <select
          value={locale}
          onChange={(event) => void handleLanguageChange(event.target.value as SupportedLanguage)}
          className="h-10 min-w-[160px] rounded-xl border border-border bg-bg-primary px-3 text-sm text-text-primary focus:border-brand focus:outline-none"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.native}
            </option>
          ))}
        </select>
      </SettingsRow>

      <SettingsRow title={t("settingsPage.currency")} description={t("settingsPage.currencyDesc")}>
        <div className="flex items-center gap-2">
          <select
            value={preferredCurrency}
            onChange={(event) => void saveCurrency(event.target.value)}
            disabled={savingCurrency}
            className="h-10 min-w-[160px] rounded-xl border border-border bg-bg-primary px-3 text-sm text-text-primary focus:border-brand focus:outline-none"
          >
            {Array.from(
              new Set([
                ...CURRENCY_CODES,
                ...(preferredCurrency ? [preferredCurrency] : []),
              ])
            ).map((code) => (
              <option key={code} value={code}>
                {code} · {t(`currencies.${code}`, { defaultValue: code })}
              </option>
            ))}
          </select>
          {savingCurrency && <Loader2 className="h-4 w-4 text-text-tertiary" />}
        </div>
      </SettingsRow>

      {currencySaved && <p className="text-xs text-green">{t("settingsPage.currencyUpdated")}</p>}
    </SettingsSection>
  );
}
