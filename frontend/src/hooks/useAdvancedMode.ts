import { useCallback, useEffect, useState } from "react";
import {
  ADVANCED_MODE_EVENT,
  getAdvancedModeEnabled,
  setAdvancedModeEnabled,
} from "../lib/advanced-mode";

export function useAdvancedMode(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(getAdvancedModeEnabled);

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      setEnabled(typeof detail === "boolean" ? detail : getAdvancedModeEnabled());
    };
    window.addEventListener(ADVANCED_MODE_EVENT, onChange);
    return () => window.removeEventListener(ADVANCED_MODE_EVENT, onChange);
  }, []);

  const update = useCallback((next: boolean) => {
    setAdvancedModeEnabled(next);
    setEnabled(next);
  }, []);

  return [enabled, update];
}
