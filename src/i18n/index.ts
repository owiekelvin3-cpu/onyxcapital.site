import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { BRAND } from "@/lib/constants";
import en from "./locales/en.json";

export const SUPPORTED_LANGUAGES = ["en", "es", "fr", "de", "ar", "zh"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = "onyx-locale";

const localeLoaders: Record<
  Exclude<SupportedLanguage, "en">,
  () => Promise<{ default: Record<string, unknown> }>
> = {
  es: () => import("./locales/es.json"),
  fr: () => import("./locales/fr.json"),
  de: () => import("./locales/de.json"),
  ar: () => import("./locales/ar.json"),
  zh: () => import("./locales/zh.json"),
};

const loadingLocales = new Map<string, Promise<void>>();

function applyDocumentLanguage(lng: string) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
}

export async function ensureLocaleLoaded(lng: string) {
  const code = (lng || "en").split("-")[0] as SupportedLanguage;
  if (code === "en" || i18n.hasResourceBundle(code, "translation")) return;
  if (!localeLoaders[code as Exclude<SupportedLanguage, "en">]) return;

  const existing = loadingLocales.get(code);
  if (existing) {
    await existing;
    return;
  }

  const load = localeLoaders[code as Exclude<SupportedLanguage, "en">]()
    .then((mod) => {
      i18n.addResourceBundle(code, "translation", mod.default, true, true);
    })
    .finally(() => {
      loadingLocales.delete(code);
    });

  loadingLocales.set(code, load);
  await load;
}

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
      },
      partialBundledLanguages: true,
      fallbackLng: "en",
      supportedLngs: [...SUPPORTED_LANGUAGES],
      nonExplicitSupportedLngs: true,
      load: "languageOnly",
      returnNull: false,
      returnEmptyString: false,
      interpolation: {
        escapeValue: false,
        defaultVariables: {
          brandName: BRAND.fullName,
          shortName: BRAND.name,
        },
      },
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: STORAGE_KEY,
        caches: ["localStorage"],
        convertDetectedLanguage: (lng) => lng.split("-")[0],
      },
      react: {
        useSuspense: false,
      },
    });

  i18n.on("languageChanged", (lng) => {
    const normalized = (lng || "en").split("-")[0];
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, normalized);
    }
    applyDocumentLanguage(normalized);
  });

  applyDocumentLanguage((i18n.language || "en").split("-")[0]);

  const initialLng = (i18n.language || "en").split("-")[0];
  if (initialLng !== "en") {
    void ensureLocaleLoaded(initialLng).then(() => {
      void i18n.changeLanguage(initialLng);
    });
  }
}

export default i18n;
