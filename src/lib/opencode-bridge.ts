import { prisma } from "./prisma.js";
import { buildImplementationBrief } from "./opencode-brief.js";
import { normalizeOpencodeDiff } from "./opencode-diff.js";
import {
  createOpencodeClientForTenant,
  resolveTenantOpencodeConfig,
} from "./tenant-opencode.js";
import { resolveOpencodeDelegationConfig } from "./product-opencode.js";
import type { SharedMemory } from "../types/index.js";
import { WORKFLOW_NAMES } from "./workflow-names.js";
import { emitRunEvent } from "../core/engine.js";
import { logSystemAudit } from "./audit.js";

export interface StartDelegationInput {
  tenantId: string;
  runId: string;
  brief: string;
  sharedMemory: SharedMemory;
  productSlug?: string;
  productId?: string;
  resumeFromStepOrder?: number;
}

export async function isOpencodeReadyForTenant(tenantId: string): Promise<boolean> {
  const config = await resolveTenantOpencodeConfig(tenantId);
  return config !== null;
}

export async function createOpencodeRunGate(input: {
  tenantId: string;
  runId: string;
  reason: string;
}): Promise<void> {
  await prisma.opencodeRunGate.upsert({
    where: { runId: input.runId },
    update: { reason: input.reason, decision: null, resolvedAt: null },
    create: {
      tenantId: input.tenantId,
      runId: input.runId,
      reason: input.reason,
    },
  });
}

export async function resolveOpencodeRunGate(input: {
  tenantId: string;
  runId: string;
  decision: "proceed_local" | "cancel";
}): Promise<{ ok: boolean; error?: string }> {
  const gate = await prisma.opencodeRunGate.findFirst({
    where: { runId: input.runId, tenantId: input.tenantId },
  });
  if (!gate) return { ok: false, error: "Gate not found" };
  if (gate.decision) return { ok: false, error: "Gate already resolved" };

  await prisma.opencodeRunGate.update({
    where: { id: gate.id },
    data: {
      decision: input.decision,
      resolvedAt: new Date(),
    },
  });

  const run = await prisma.executionRun.findUnique({
    where: { id: input.runId },
    include: { workflow: { select: { name: true } } },
  });
  if (!run) return { ok: false, error: "Run not found" };

  if (input.decision === "cancel") {
    await prisma.executionRun.update({
      where: { id: input.runId },
      data: { status: "CANCELLED", completedAt: new Date(), errorMessage: "Cancelled: OpenCode not configured" },
    });
    emitRunEvent({
      type: "done",
      runId: input.runId,
      timestamp: new Date().toISOString(),
      data: { status: "CANCELLED" },
    });
    return { ok: true };
  }

  const sharedMemory = {
    ...(run.sharedMemory as SharedMemory),
    _implementationMode: "local",
  } as SharedMemory;

  await prisma.executionRun.update({
    where: { id: input.runId },
    data: { status: "PENDING", sharedMemory: sharedMemory as object, errorMessage: null },
  });

  const { enqueueWorkflowRun } = await import("../worker/queue.js");
  await enqueueWorkflowRun({
    runId: input.runId,
    workflowId: run.workflowId,
    tenantId: input.tenantId,
    initialMemory: sharedMemory,
    mergeConsensus: false,
    syncConsensus: true,
    productSlug: (() => {
      const slug = (sharedMemory as SharedMemory).focusProductSlug;
      return typeof slug === "string" ? slug : undefined;
    })(),
    workflowName: run.workflow.name,
    forceLocalImplementation: true,
  });

  return { ok: true };
}

export async function startOpencodeDelegation(input: StartDelegationInput): Promise<string> {
  const existing = await prisma.opencodeDelegation.findUnique({ where: { runId: input.runId } });
  if (existing) return existing.id;

  const config = await resolveOpencodeDelegationConfig(input.tenantId, input.productId);
  if (!config) {
    throw new Error("OpenCode is not configured for this tenant");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: { slug: true, name: true },
  });

  const client = createOpencodeClientForTenant(config);
  const title = `Auto-Company · ${input.productSlug ?? tenant?.slug ?? input.runId}`;
  const session = await client.createSession(title);

  const fullBrief = buildImplementationBrief({
    brief: input.brief,
    sharedMemory: input.sharedMemory,
    productSlug: input.productSlug,
    productName:
      typeof input.sharedMemory.focusProductName === "string"
        ? input.sharedMemory.focusProductName
        : undefined,
    tenantSlug: tenant?.slug,
    projectPath: config.projectPath,
  });

  await client.promptAsync(session.id, fullBrief, {
    agent: config.defaultAgent,
    model: config.defaultModel,
    system:
      "You are implementing code on behalf of an autonomous AI company. Make the requested changes in the workspace, run tests if appropriate, and finish with a concise summary.",
  });

  const delegation = await prisma.opencodeDelegation.create({
    data: {
      tenantId: input.tenantId,
      runId: input.runId,
      productId: input.productId ?? null,
      opencodeSessionId: session.id,
      status: "RUNNING",
      promptSummary: fullBrief.slice(0, 4000),
      resumeFromStepOrder: input.resumeFromStepOrder ?? 3,
      startedAt: new Date(),
    },
  });

  await prisma.executionRun.update({
    where: { id: input.runId },
    data: { status: "DELEGATED" },
  });

  emitRunEvent({
    type: "status",
    runId: input.runId,
    timestamp: new Date().toISOString(),
    data: { status: "DELEGATED", opencodeSessionId: session.id },
  });

  const { enqueueOpencodePoll } = await import("../worker/opencode-queue.js");
  await enqueueOpencodePoll({ delegationId: delegation.id });

  await appendDelegationLog(input.runId, "info", "Delegated implementation to OpenCode", {
    opencodeSessionId: session.id,
  });

  await logSystemAudit({
    action: "opencode.delegate.start",
    tenantId: input.tenantId,
    metadata: {
      runId: input.runId,
      delegationId: delegation.id,
      opencodeSessionId: session.id,
      productId: input.productId ?? null,
    },
  });

  return delegation.id;
}

export async function pollOpencodeDelegation(delegationId: string): Promise<"continue" | "done" | "failed"> {
  const delegation = await prisma.opencodeDelegation.findUnique({
    where: { id: delegationId },
    include: { run: { include: { workflow: { select: { name: true } } } } },
  });
  if (!delegation) return "failed";
  if (delegation.status === "COMPLETED" || delegation.status === "CANCELLED") return "done";
  if (delegation.status === "FAILED" || delegation.status === "TIMEOUT") return "failed";

  const config = await resolveTenantOpencodeConfig(delegation.tenantId);
  if (!config) {
    await failDelegation(delegation.id, delegation.runId, "OpenCode configuration removed");
    return "failed";
  }

  const started = delegation.startedAt?.getTime() ?? delegation.createdAt.getTime();
  if (Date.now() - started > config.maxWaitMs) {
    await failDelegation(delegation.id, delegation.runId, "OpenCode delegation timed out");
    try {
      const client = createOpencodeClientForTenant(config);
      await client.abortSession(delegation.opencodeSessionId);
    } catch {
      // ignore abort errors
    }
    return "failed";
  }

  const client = createOpencodeClientForTenant(config);
  const approved = await client.autoApprovePendingPermissions(delegation.opencodeSessionId);
  if (approved > 0) {
    await appendDelegationLog(delegation.runId, "info", `Auto-approved ${approved} OpenCode permission(s)`);
  }

  const statuses = await client.getSessionStatuses();

  if (client.isSessionRunning(statuses, delegation.opencodeSessionId)) {
    return "continue";
  }

  if (!client.isSessionIdle(statuses, delegation.opencodeSessionId)) {
    return "continue";
  }

  await finalizeOpencodeDelegation(delegation.id);
  return "done";
}

export async function finalizeOpencodeDelegation(delegationId: string): Promise<void> {
  const delegation = await prisma.opencodeDelegation.findUnique({
    where: { id: delegationId },
    include: { run: { include: { workflow: { select: { name: true } } } } },
  });
  if (!delegation || delegation.status === "COMPLETED") return;

  const config = await resolveTenantOpencodeConfig(delegation.tenantId);
  if (!config) {
    await failDelegation(delegation.id, delegation.runId, "OpenCode configuration missing");
    return;
  }

  const client = createOpencodeClientForTenant(config);
  let diff: unknown[] = [];
  let summary = "";

  try {
    diff = await client.getSessionDiff(delegation.opencodeSessionId);
  } catch (err) {
    await appendDelegationLog(delegation.runId, "warn", "Could not fetch OpenCode diff", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    const messages = await client.getMessages(delegation.opencodeSessionId);
    summary = client.extractAssistantSummary(messages);
  } catch (err) {
    await appendDelegationLog(delegation.runId, "warn", "Could not fetch OpenCode messages", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const diffCount = Array.isArray(diff) ? diff.length : 0;
  const resultSummary =
    summary ||
    (diffCount > 0 ? `OpenCode completed with ${diffCount} file change(s).` : "OpenCode session finished.");

  const sharedMemory = {
    ...(delegation.run.sharedMemory as SharedMemory),
    opencodeSessionId: delegation.opencodeSessionId,
    opencodeResultSummary: resultSummary,
    opencodeDiffCount: diffCount,
    opencodeDiff: diff,
  } as SharedMemory;

  await prisma.opencodeDelegation.update({
    where: { id: delegation.id },
    data: {
      status: "COMPLETED",
      resultSummary,
      diffJson: diff as object,
      completedAt: new Date(),
    },
  });

  await prisma.executionRun.update({
    where: { id: delegation.runId },
    data: {
      status: "RUNNING",
      sharedMemory: sharedMemory as object,
    },
  });

  await appendDelegationLog(delegation.runId, "info", "OpenCode delegation completed", {
    diffCount,
    summaryPreview: resultSummary.slice(0, 500),
  });

  await logSystemAudit({
    action: "opencode.delegate.complete",
    tenantId: delegation.tenantId,
    metadata: {
      runId: delegation.runId,
      delegationId: delegation.id,
      opencodeSessionId: delegation.opencodeSessionId,
      diffCount,
    },
  });

  const { notifyOpencodeDelegationCompleted } = await import("./usage-limits.js");
  void notifyOpencodeDelegationCompleted({
    tenantId: delegation.tenantId,
    runId: delegation.runId,
    workflowName: delegation.run.workflow.name,
    diffCount,
    resultSummary,
  });

  const { enqueueWorkflowRun } = await import("../worker/queue.js");
  await enqueueWorkflowRun({
    runId: delegation.runId,
    workflowId: delegation.run.workflowId,
    tenantId: delegation.tenantId,
    initialMemory: sharedMemory,
    mergeConsensus: false,
    syncConsensus: true,
    productSlug:
      typeof sharedMemory.focusProductSlug === "string" ? sharedMemory.focusProductSlug : undefined,
    workflowName: delegation.run.workflow.name,
    resumeFromStepOrder: delegation.resumeFromStepOrder,
    afterOpencodeDelegation: true,
  });
}

async function failDelegation(
  delegationId: string,
  runId: string,
  message: string,
  options?: { degradeToLocal?: boolean },
): Promise<void> {
  const delegation = await prisma.opencodeDelegation.findUnique({
    where: { id: delegationId },
    include: { run: { include: { workflow: { select: { name: true, id: true } } } } },
  });
  if (!delegation) return;

  const degrade = options?.degradeToLocal !== false;

  if (degrade && delegation.run.tenantId) {
    await prisma.opencodeDelegation.update({
      where: { id: delegationId },
      data: {
        status: "FAILED",
        errorMessage: message,
        completedAt: new Date(),
      },
    });

    const sharedMemory = {
      ...(delegation.run.sharedMemory as SharedMemory),
      _implementationMode: "local",
      opencodeDegraded: true,
      opencodeDegradeReason: message,
    } as SharedMemory;

    await prisma.executionRun.update({
      where: { id: runId },
      data: {
        status: "PENDING",
        errorMessage: `OpenCode unavailable — continuing locally: ${message}`,
        sharedMemory: sharedMemory as object,
      },
    });

    await appendDelegationLog(runId, "warn", "OpenCode failed — degrading to local implementation", {
      error: message,
    });

    const { enqueueWorkflowRun } = await import("../worker/queue.js");
    await enqueueWorkflowRun({
      runId,
      workflowId: delegation.run.workflowId,
      tenantId: delegation.run.tenantId,
      initialMemory: sharedMemory,
      mergeConsensus: false,
      syncConsensus: true,
      productSlug:
        typeof sharedMemory.focusProductSlug === "string" ? sharedMemory.focusProductSlug : undefined,
      workflowName: delegation.run.workflow.name,
      resumeFromStepOrder: delegation.resumeFromStepOrder,
      forceLocalImplementation: true,
    });
    return;
  }

  await prisma.opencodeDelegation.update({
    where: { id: delegationId },
    data: {
      status: "FAILED",
      errorMessage: message,
      completedAt: new Date(),
    },
  });

  await prisma.executionRun.update({
    where: { id: runId },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage: message,
    },
  });

  await appendDelegationLog(runId, "error", message);

  emitRunEvent({
    type: "done",
    runId,
    timestamp: new Date().toISOString(),
    data: { status: "FAILED", error: message },
  });

  const run = await prisma.executionRun.findUnique({
    where: { id: runId },
    include: { workflow: { select: { name: true } } },
  });
  if (run?.tenantId) {
    const { notifyRunFinished } = await import("./usage-limits.js");
    void notifyRunFinished({
      tenantId: run.tenantId,
      runId,
      status: "FAILED",
      workflowName: run.workflow.name,
      totalCostUsd: run.totalCostUsd,
      totalTokens: run.totalTokens,
      errorMessage: message,
    });
  }
}

export async function cancelOpencodeDelegation(runId: string, tenantId: string): Promise<void> {
  const delegation = await prisma.opencodeDelegation.findFirst({
    where: { runId, tenantId, status: { in: ["PENDING", "RUNNING"] } },
  });
  if (!delegation) return;

  const config = await resolveTenantOpencodeConfig(tenantId);
  if (config) {
    try {
      const client = createOpencodeClientForTenant(config);
      await client.abortSession(delegation.opencodeSessionId);
    } catch {
      // ignore
    }
  }

  await prisma.opencodeDelegation.update({
    where: { id: delegation.id },
    data: { status: "CANCELLED", completedAt: new Date() },
  });
}

export async function getOpencodeDelegationForRun(runId: string, tenantId: string) {
  const delegation = await prisma.opencodeDelegation.findFirst({
    where: { runId, tenantId },
  });
  if (!delegation) return null;
  return {
    ...delegation,
    diff: normalizeOpencodeDiff(delegation.diffJson),
  };
}

export async function appendDelegationLog(
  runId: string,
  level: "info" | "warn" | "error",
  message: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  await prisma.executionLog.create({
    data: {
      runId,
      level,
      message,
      payload: payload as object | undefined,
    },
  });

  emitRunEvent({
    type: "log",
    runId,
    timestamp: new Date().toISOString(),
    data: { level, message, payload },
  });
}

export function shouldUseOpencodeForWorkflow(
  workflowName: string,
  forceLocalImplementation?: boolean,
  hasFullstackStep = workflowName === WORKFLOW_NAMES.FEATURE_DEVELOPMENT,
): boolean {
  if (forceLocalImplementation) return false;
  return hasFullstackStep;
}

export async function prepareOpencodeImplementationGate(input: {
  tenantId: string;
  runId: string;
  forceLocalImplementation?: boolean;
}): Promise<"opencode" | "local" | "awaiting_user" | "cancelled"> {
  if (input.forceLocalImplementation) return "local";

  const ready = await isOpencodeReadyForTenant(input.tenantId);
  if (ready) return "opencode";

  const gate = await prisma.opencodeRunGate.findUnique({ where: { runId: input.runId } });
  if (gate?.decision === "proceed_local") return "local";
  if (gate?.decision === "cancel") return "cancelled";

  if (!gate) {
    await createOpencodeRunGate({
      tenantId: input.tenantId,
      runId: input.runId,
      reason: "opencode_not_configured",
    });

    await prisma.executionRun.update({
      where: { id: input.runId },
      data: { status: "AWAITING_USER" },
    });

    const run = await prisma.executionRun.findUnique({
      where: { id: input.runId },
      include: { workflow: { select: { name: true } } },
    });
    if (run?.tenantId) {
      const { notifyOpencodeGateRequired } = await import("./usage-limits.js");
      void notifyOpencodeGateRequired({
        tenantId: run.tenantId,
        runId: input.runId,
        workflowName: run.workflow.name,
      });
    }

    emitRunEvent({
      type: "status",
      runId: input.runId,
      timestamp: new Date().toISOString(),
      data: { status: "AWAITING_USER", reason: "opencode_not_configured" },
    });

    return "awaiting_user";
  }

  return "awaiting_user";
}

/** @deprecated Use prepareOpencodeImplementationGate */
export const prepareFeatureDevelopmentGate = prepareOpencodeImplementationGate;
