export function isStuckPivotNextAction(nextAction: string): boolean {
  return nextAction.trim().startsWith('STUCK on "');
}

export function workflowTaskStorageKey(workflowId: string): string {
  return `workflow-run-task:${workflowId}`;
}

export function storeWorkflowTask(workflowId: string, task: string): void {
  const trimmed = task.trim();
  if (!trimmed) return;
  sessionStorage.setItem(workflowTaskStorageKey(workflowId), trimmed);
}

export function consumeStoredWorkflowTask(workflowId: string): string | null {
  const key = workflowTaskStorageKey(workflowId);
  const value = sessionStorage.getItem(key);
  if (value) sessionStorage.removeItem(key);
  return value?.trim() || null;
}

/** Pick the initial run task for the workflow editor execute panel. */
export function resolveWorkflowTaskOverride(input: {
  storedTask?: string | null;
  locationTask?: string | null;
  consensusNextAction?: string | null;
  workflowDescription?: string | null;
}): string {
  const stored = input.storedTask?.trim();
  if (stored) return stored;

  const fromNav = input.locationTask?.trim();
  if (fromNav) return fromNav;

  const consensus = input.consensusNextAction?.trim();
  if (consensus && !isStuckPivotNextAction(consensus)) return consensus;

  return input.workflowDescription?.trim() ?? "";
}
