import { useTranslation } from "react-i18next";
import { setAppLanguage, type AppLanguage } from "../i18n";

const OPTIONS: Array<{ value: AppLanguage; labelKey: "language.es" | "language.en" }> = [
  { value: "es", labelKey: "language.es" },
  { value: "en", labelKey: "language.en" },
];

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = (i18n.language === "en" ? "en" : "es") as AppLanguage;

  return (
    <label className="inline-flex items-center gap-1.5 text-sm">
      <span className="sr-only">{t("language.label")}</span>
      <select
        value={current}
        onChange={(e) => setAppLanguage(e.target.value as AppLanguage)}
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-xs"
        aria-label={t("language.label")}
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </option>
        ))}
      </select>
    </label>
  );
}
