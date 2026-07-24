export type AppTheme = "letter" | "paperclip" | "slash";

const STORAGE_KEY = "auto-company-ui-theme";
const MIGRATION_KEY = "auto-company-ui-theme-v3";

export const DEFAULT_THEME: AppTheme = "letter";

const VALID_THEMES: readonly AppTheme[] = ["letter", "paperclip", "slash"];

export function isAppTheme(value: string | null | undefined): value is AppTheme {
  return value != null && (VALID_THEMES as readonly string[]).includes(value);
}

function hasBrowserStorage(): boolean {
  return typeof localStorage !== "undefined";
}

/** Read persisted theme; migrates legacy `letter` (Paperclip) once to `paperclip`. */
export function getStoredTheme(): AppTheme {
  if (!hasBrowserStorage()) return DEFAULT_THEME;

  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored === "letter" && !localStorage.getItem(MIGRATION_KEY)) {
    localStorage.setItem(STORAGE_KEY, "paperclip");
    localStorage.setItem(MIGRATION_KEY, "1");
    return "paperclip";
  }

  if (isAppTheme(stored)) return stored;

  return DEFAULT_THEME;
}

export function applyTheme(theme: AppTheme): void {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
  }
  if (hasBrowserStorage()) {
    localStorage.setItem(STORAGE_KEY, theme);
  }
}

export const THEME_OPTIONS: Array<{
  value: AppTheme;
  labelKey: "theme.letter" | "theme.paperclip" | "theme.slash";
}> = [
  { value: "letter", labelKey: "theme.letter" },
  { value: "paperclip", labelKey: "theme.paperclip" },
  { value: "slash", labelKey: "theme.slash" },
];
