import { prisma } from "./prisma.js";
import { tenantHasActiveRun } from "./orchestration-conditions.js";

export type RunGuardCode = "ACTIVE_RUN" | "PENDING_DECISIONS";

export class RunGuardError extends Error {
  readonly code: RunGuardCode;

  constructor(code: RunGuardCode, message: string) {
    super(message);
    this.name = "RunGuardError";
    this.code = code;
  }
}

export interface RunGuardOptions {
  /** Skip active-run check (e.g. resume after OpenCode). */
  allowActiveRun?: boolean;
  /** Skip pending GO/NO-GO gate (e.g. human-initiated drill-down). */
  allowPendingDecisions?: boolean;
}

export async function countPendingDecisions(tenantId: string): Promise<number> {
  return prisma.decisionProposal.count({
    where: { tenantId, status: { in: ["pending_review", "drilling"] } },
  });
}

export async function assertTenantCanLaunchRun(
  tenantId: string,
  options: RunGuardOptions = {},
): Promise<void> {
  if (!options.allowActiveRun && (await tenantHasActiveRun(tenantId))) {
    throw new RunGuardError(
      "ACTIVE_RUN",
      "A workflow is already running. Wait for it to finish or cancel it before starting new work.",
    );
  }

  if (!options.allowPendingDecisions && (await countPendingDecisions(tenantId)) > 0) {
    throw new RunGuardError(
      "PENDING_DECISIONS",
      "Human GO/NO-GO decisions are pending. Review them at /decisions before launching new work.",
    );
  }
}

export async function canExecuteMetaScheduleRun(
  tenantId: string,
): Promise<{ ok: true } | { ok: false; reason: RunGuardCode }> {
  if (await tenantHasActiveRun(tenantId)) {
    return { ok: false, reason: "ACTIVE_RUN" };
  }
  if ((await countPendingDecisions(tenantId)) > 0) {
    return { ok: false, reason: "PENDING_DECISIONS" };
  }
  return { ok: true };
}

const BLOCK_MESSAGES: Record<RunGuardCode, string> = {
  ACTIVE_RUN:
    "A workflow is already running. Wait for it to finish or cancel it before the meta cycle can continue.",
  PENDING_DECISIONS:
    "Human GO/NO-GO decisions are pending. Review them at /decisions before launching new work.",
};

export function runGuardMessage(code: RunGuardCode): string {
  return BLOCK_MESSAGES[code];
}

export async function describeRunLaunchBlock(
  tenantId: string,
): Promise<{ canExecute: true } | { canExecute: false; code: RunGuardCode; message: string }> {
  const guard = await canExecuteMetaScheduleRun(tenantId);
  if (guard.ok) return { canExecute: true };
  return {
    canExecute: false,
    code: guard.reason,
    message: runGuardMessage(guard.reason),
  };
}
