type PendingDecisionsListener = () => void;

const listeners = new Set<PendingDecisionsListener>();

export function subscribePendingDecisionsChanged(listener: PendingDecisionsListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyPendingDecisionsChanged(): void {
  for (const listener of listeners) listener();
}
