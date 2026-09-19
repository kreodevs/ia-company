import type { CoordinatorChatMessage } from "./api";

const STORAGE_PREFIX = "ac.coordinator.thread.v1";

export function coordinatorThreadScopeKey(productId?: string, orgUnitId?: string): string {
  return `${productId?.trim() || "general"}::${orgUnitId?.trim() || "none"}`;
}

export function loadCoordinatorThread(scopeKey: string): CoordinatorChatMessage[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}.${scopeKey}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CoordinatorChatMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (msg) =>
        msg &&
        (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string",
    );
  } catch {
    return [];
  }
}

export function saveCoordinatorThread(scopeKey: string, messages: CoordinatorChatMessage[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    const trimmed = messages
      .filter((msg) => msg.role === "user" || msg.role === "assistant")
      .slice(-40);
    localStorage.setItem(`${STORAGE_PREFIX}.${scopeKey}`, JSON.stringify(trimmed));
  } catch {
    /* ignore quota */
  }
}

export function clearCoordinatorThread(scopeKey: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}.${scopeKey}`);
  } catch {
    /* ignore */
  }
}
