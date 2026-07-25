import type { ExecutionStatus } from "@prisma/client";
import type { SharedMemory } from "../types/index.js";
import { prisma } from "./prisma.js";
import {
  extractHandoffFromAgentOutput,
  getProductConsensus,
  updateProductConsensusContent,
} from "./product-consensus.js";
import { asString } from "./structured-memory.js";
import {
  buildStuckPivotNextAction,
  isStuckPivotNextAction,
  unwrapStuckNextAction,
} from "./stuck-action.js";
import { WORKFLOW_NAMES } from "./workflow-names.js";

export interface RunClosureMeta {
  at: string;
  runStatus: ExecutionStatus;
  stepsTotal: number;
  stepsWithOutput: number;
  deliverablesSaved: number;
  nextAction: string;
  consensusSizeBytes: number;
  mcpToolCalls: number;
  mcpFallbackUsed: boolean;
  deskItemsCreated?: number;
}

const VAGUE_NEXT_ACTION = /^(execute|continue|proceed|next step|tbd|n\/a)/i;

function defaultNextActionForWorkflow(workflowName: string, productName: string): string {
  switch (workflowName) {
    case WORKFLOW_NAMES.SEO_REVIEW:
      return `Ship top 3 SEO fixes for ${productName} and measure landing page impressions in 7 days.`;
    case WORKFLOW_NAMES.PRICING_MONETIZATION:
      return `Publish pricing page draft for ${productName} and run 5 customer price interviews.`;
    case WORKFLOW_NAMES.PRODUCT_LAUNCH:
      return `Launch ${productName} to first 10 beta users and capture conversion feedback.`;
    case WORKFLOW_NAMES.MARKETING_SPRINT:
      return `Publish one channel-ready campaign asset for ${productName} and track click-through.`;
    case WORKFLOW_NAMES.FEATURE_DEVELOPMENT:
      return `Merge the smallest shippable feature slice for ${productName} and verify in staging.`;
    case WORKFLOW_NAMES.WEEKLY_REVIEW:
      return `Review ${productName} KPIs and pick one growth experiment for next week.`;
    default:
      return `Define the single highest-leverage next task for ${productName} and assign an owner.`;
  }
}

function resolveConcreteNextAction(input: {
  memory: SharedMemory;
  workflowName: string;
  productName: string;
}): string {
  const fromMemory = asString(input.memory.nextAction);
  if (fromMemory) {
    const unwrapped = unwrapStuckNextAction(fromMemory);
    if (unwrapped.length >= 12 && !VAGUE_NEXT_ACTION.test(unwrapped)) {
      return unwrapped;
    }
  }

  const history = Array.isArray(input.memory._history) ? input.memory._history : [];
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (!h?.agentName) continue;
    const stepOutput =
      typeof h.output === "string" && h.output.trim()
        ? h.output
        : typeof input.memory[h.agentName] === "string"
          ? String(input.memory[h.agentName])
          : "";
    const handoff = extractHandoffFromAgentOutput(stepOutput, h.agentName, h.stepOrder ?? i + 1);
    const candidate = handoff.nextAction ? unwrapStuckNextAction(handoff.nextAction) : null;
    if (candidate && candidate.length >= 12 && !VAGUE_NEXT_ACTION.test(candidate)) {
      return candidate;
    }
  }

  const fallback = defaultNextActionForWorkflow(input.workflowName, input.productName);
  if (fromMemory && isStuckPivotNextAction(fromMemory)) {
    return buildStuckPivotNextAction(fallback);
  }
  return fallback;
}

export function collectRunClosureStats(memory: SharedMemory): {
  stepsTotal: number;
  stepsWithOutput: number;
  deliverablesSaved: number;
} {
  const history = Array.isArray(memory._history) ? memory._history : [];
  let stepsWithOutput = 0;
  let deliverablesSaved = 0;

  for (const h of history) {
    const output = typeof h.output === "string" ? h.output.trim() : "";
    if (output.length > 0) stepsWithOutput += 1;
    if (h.wroteDocs === true || (typeof h.savedDeliverablePath === "string" && h.savedDeliverablePath.trim())) {
      deliverablesSaved += 1;
    }
  }

  return { stepsTotal: history.length, stepsWithOutput, deliverablesSaved };
}

export async function finalizeProductRunClosure(input: {
  tenantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  memory: SharedMemory;
  runId: string;
  workflowName: string;
  runStatus: ExecutionStatus;
}): Promise<SharedMemory> {
  const stats = collectRunClosureStats(input.memory);
  const nextAction = resolveConcreteNextAction({
    memory: input.memory,
    workflowName: input.workflowName,
    productName: input.productName,
  });

  const consensus = await getProductConsensus(input.productId);
  const consensusSizeBytes = Buffer.byteLength(consensus?.content ?? "", "utf8");

  const mcpToolCalls =
    typeof input.memory._mcpToolCalls === "number" ? input.memory._mcpToolCalls : 0;
  const mcpFallbackUsed = input.memory._mcpFallbackUsed === true;

  const closure: RunClosureMeta = {
    at: new Date().toISOString(),
    runStatus: input.runStatus,
    stepsTotal: stats.stepsTotal,
    stepsWithOutput: stats.stepsWithOutput,
    deliverablesSaved: stats.deliverablesSaved,
    nextAction,
    consensusSizeBytes,
    mcpToolCalls,
    mcpFallbackUsed,
  };

  if (consensus && consensus.nextAction !== nextAction) {
    await updateProductConsensusContent(
      input.productId,
      input.productSlug,
      consensus.content,
      nextAction,
    );
  }

  await prisma.executionRun.update({
    where: { id: input.runId },
    data: {
      sharedMemory: {
        ...input.memory,
        nextAction,
        _runClosure: closure,
      } as object,
    },
  });

  try {
    const { persistDeskItemsFromRun } = await import("./product-desk.js");
    const deskCreated = await persistDeskItemsFromRun({
      tenantId: input.tenantId,
      productId: input.productId,
      productName: input.productName,
      runId: input.runId,
      workflowName: input.workflowName,
      memory: { ...input.memory, nextAction },
    });
    closure.deskItemsCreated = deskCreated;

    const { syncRecommendationsToDesk } = await import("./product-desk-recommender.js");
    await syncRecommendationsToDesk({ tenantId: input.tenantId, productId: input.productId });

    const inputRefs = Array.isArray(input.memory.deskInputRefs)
      ? (input.memory.deskInputRefs as Array<{ deskItemId?: string }>)
      : [];
    const deskIds = inputRefs
      .map((r) => (typeof r.deskItemId === "string" ? r.deskItemId : null))
      .filter((id): id is string => Boolean(id));
    if (deskIds.length > 0) {
      const { markDeskItemsConsumed } = await import("./product-desk.js");
      await markDeskItemsConsumed({ deskItemIds: deskIds, runId: input.runId });
    }

    await prisma.productDeskItem.updateMany({
      where: { consumedByRunId: input.runId, status: "in_progress" },
      data: { status: "consumed" },
    });
  } catch (err) {
    console.warn("[product-run-closure] desk persist failed:", err);
  }

  return {
    ...input.memory,
    nextAction,
    _runClosure: closure,
  };
}
