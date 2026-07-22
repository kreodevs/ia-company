import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";
import { THEME_OPTIONS } from "../lib/theme";

export default function ThemeSwitcher() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <label className="inline-flex items-center gap-1.5 text-sm">
      <span className="sr-only">{t("theme.label")}</span>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as typeof theme)}
        className="rounded-[var(--radius-inputs)] border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-xs"
        aria-label={t("theme.label")}
      >
        {THEME_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </option>
        ))}
      </select>
    </label>
  );
}
