import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import { es } from "./locales/es";

export const LANGUAGE_STORAGE_KEY = "auto-company-lang";
export const SUPPORTED_LANGUAGES = ["es", "en"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function readStoredLanguage(): AppLanguage {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "es" || stored === "en") return stored;
  return "es";
}

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: readStoredLanguage(),
  fallbackLng: "es",
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export function setAppLanguage(lang: AppLanguage) {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  void i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}

document.documentElement.lang = i18n.language;

export default i18n;
