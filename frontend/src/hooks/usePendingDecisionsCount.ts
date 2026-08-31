import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import {
  notifyPendingDecisionsChanged,
  subscribePendingDecisionsChanged,
} from "../lib/pending-decisions-sync";

export function usePendingDecisionsCount(enabled: boolean): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    api.decisions
      .pendingCount()
      .then((result) => setCount(result.count))
      .catch(() => setCount(0));
  }, [enabled]);

  useEffect(() => {
    refresh();
    return subscribePendingDecisionsChanged(refresh);
  }, [refresh]);

  return count;
}

export { notifyPendingDecisionsChanged };
