const cancelledRuns = new Set<string>();

export function requestRunCancellation(runId: string): void {
  cancelledRuns.add(runId);
}

export function isRunCancelled(runId: string): boolean {
  return cancelledRuns.has(runId);
}

export function clearRunCancellation(runId: string): void {
  cancelledRuns.delete(runId);
}
