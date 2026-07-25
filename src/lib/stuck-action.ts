export const STUCK_PIVOT_SUFFIX = " — pivot: ship smallest vertical slice today";

export function isStuckPivotNextAction(nextAction: string): boolean {
  return nextAction.trim().startsWith('STUCK on "');
}

/** Peel nested or corrupted STUCK pivot wrappers down to the base action. */
export function unwrapStuckNextAction(nextAction: string): string {
  let current = nextAction.trim();
  if (!current) return nextAction;

  while (true) {
    const match = current.match(
      new RegExp(`^STUCK on "(.+)"${escapeRegExp(STUCK_PIVOT_SUFFIX)}$`),
    );
    if (!match) break;
    current = match[1].replace(/\\"/g, '"').trim();
  }

  while (current.startsWith('STUCK on "')) {
    current = current.slice('STUCK on "'.length);
  }

  current = current
    .replace(/\\"/g, '"')
    .replace(/"\s*— pivot.*$/s, "")
    .replace(/"+$/g, "")
    .trim();

  if (
    !current ||
    current.startsWith('STUCK on "') ||
    current.length < 8 ||
    /^ST(UCK)?$/i.test(current)
  ) {
    return "Ship the smallest vertical slice today";
  }

  return current;
}

export function buildStuckPivotNextAction(baseAction: string): string {
  const base = unwrapStuckNextAction(baseAction).replace(/"/g, '\\"');
  return `STUCK on "${base}"${STUCK_PIVOT_SUFFIX}`;
}

/** Normalize nextAction when loading consensus into a run (fixes corrupted chains). */
export function sanitizeLoadedNextAction(nextAction: string): string {
  if (!isStuckPivotNextAction(nextAction)) {
    return nextAction.trim();
  }
  return buildStuckPivotNextAction(nextAction);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
