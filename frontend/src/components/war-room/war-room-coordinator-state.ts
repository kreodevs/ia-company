import { useCallback, useState } from "react";

function readCollapsed(storageKey: string): boolean {
  try {
    return localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(storageKey: string, collapsed: boolean): void {
  try {
    localStorage.setItem(storageKey, collapsed ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
}

export function useWarRoomCoordinatorCollapsed(storageKey: string) {
  const [collapsed, setCollapsed] = useState(() => readCollapsed(storageKey));

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsed(storageKey, next);
      return next;
    });
  }, [storageKey]);

  return { collapsed, toggleCollapsed, setCollapsed };
}

export const WAR_ROOM_COORDINATOR_STORAGE_KEYS = {
  product: "war-room-coordinator-collapsed",
  general: "war-room-general-coordinator-collapsed",
} as const;
