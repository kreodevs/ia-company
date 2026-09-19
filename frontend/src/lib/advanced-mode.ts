const STORAGE_KEY = "ac.advanced-mode";

export const ADVANCED_MODE_EVENT = "ac:advanced-mode-changed";

export function getAdvancedModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAdvancedModeEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    window.dispatchEvent(new CustomEvent(ADVANCED_MODE_EVENT, { detail: enabled }));
  } catch {
    /* ignore */
  }
}
