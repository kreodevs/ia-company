export type AppTheme = "letter" | "slash";

const STORAGE_KEY = "auto-company-ui-theme";

export function getStoredTheme(): AppTheme {
  if (typeof window === "undefined") return "letter";
  return localStorage.getItem(STORAGE_KEY) === "slash" ? "slash" : "letter";
}

export function applyTheme(theme: AppTheme): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

export const THEME_OPTIONS: Array<{ value: AppTheme; labelKey: "theme.letter" | "theme.slash" }> = [
  { value: "letter", labelKey: "theme.letter" },
  { value: "slash", labelKey: "theme.slash" },
];
