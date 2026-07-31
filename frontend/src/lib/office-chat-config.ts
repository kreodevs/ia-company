/** Frontend-only coordinator chat settings (no .env). */
export type OfficeChatMode = "stream" | "legacy";

export const officeChatConfig = {
  /** Default transport: TanStack AI SSE with tools + HITL. */
  defaultMode: "stream" satisfies OfficeChatMode,
  /** Allow persisting mode override in localStorage. */
  persistModePreference: true,
  storageKey: "ac.office-chat-mode-v1",
  /** SSE endpoint (relative to VITE_API_URL /api). */
  streamPath: "/office/chat/stream",
} as const;

export function getOfficeChatMode(): OfficeChatMode {
  if (officeChatConfig.persistModePreference && typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(officeChatConfig.storageKey);
    if (stored === "stream" || stored === "legacy") return stored;
  }
  return officeChatConfig.defaultMode;
}

export function setOfficeChatMode(mode: OfficeChatMode): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(officeChatConfig.storageKey, mode);
  }
}

export function isOfficeChatStreamEnabled(): boolean {
  return getOfficeChatMode() === "stream";
}
