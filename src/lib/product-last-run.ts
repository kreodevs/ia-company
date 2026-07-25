import type { ExecutionRun, ExecutionStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { listProductAgentDocs } from "./product-code.js";
import { getProductConsensus } from "./product-consensus.js";
import type { SharedMemory } from "../types/index.js";

export interface ProductLastRunStepTrace {
  agentName: string;
  stepOrder: number;
  outputChars: number;
  memoryKeyChars: number;
  hasStructuredHandoff: boolean;
  wroteDocs: boolean;
  savedDeliverablePath: string | null;
  deliverableStatus: "saved_to_disk" | "handoff_only" | "missing";
  outputPreview: string;
  output: string;
  tokensUsed: number | null;
}

export interface ProductLastRunTrace {
  run: {
    id: string;
    status: ExecutionStatus;
    workflowName: string;
    totalTokens: number;
    totalCostUsd: number;
    startedAt: string | null;
    completedAt: string | null;
    errorMessage: string | null;
    createdAt: string;
  } | null;
  steps: ProductLastRunStepTrace[];
  revisionsRecorded: number;
  docsInWorkspace: number;
  deliverablesSaved: number;
  deliverablesTotal: number;
  consensusSizeKb: number;
  mcpToolCalls: number;
  mcpFallbackUsed: boolean;
  /** Short hint for operators — why the UI might look empty */
  diagnosis: string;
}

function runMatchesProduct(
  sharedMemory: unknown,
  product: { id: string; slug: string },
): boolean {
  if (!sharedMemory || typeof sharedMemory !== "object") return false;
  const mem = sharedMemory as SharedMemory;
  return mem.focusProductSlug === product.slug || mem.productId === product.id;
}

function hasStructuredHandoff(text: string): boolean {
  return /```(?:json)?[\s\S]*?consensusUpdate|```(?:json)?[\s\S]*?"nextAction"/i.test(text);
}

export function resolveStepDeliverableStatus(input: {
  outputChars: number;
  memoryKeyChars: number;
  hasStructuredHandoff: boolean;
  wroteDocs?: boolean;
  savedDeliverablePath?: string;
}): ProductLastRunStepTrace["deliverableStatus"] {
  const hasOutput = input.outputChars > 0 || input.memoryKeyChars > 0;
  if (input.wroteDocs || input.savedDeliverablePath?.trim()) {
    return "saved_to_disk";
  }
  if (hasOutput || input.hasStructuredHandoff) {
    return "handoff_only";
  }
  return "missing";
}

export function buildProductLastRunDiagnosis(input: {
  run: ProductLastRunTrace["run"];
  steps: ProductLastRunStepTrace[];
  revisionsRecorded: number;
  docsInWorkspace: number;
}): string {
  if (!input.run) {
    return "no_run";
  }
  if (
    input.run.status === "CANCELLED" &&
    input.run.errorMessage?.startsWith("VETO:")
  ) {
    return "munger_veto";
  }
  if (input.run.status === "FAILED") {
    return "run_failed";
  }
  if (input.run.status === "RUNNING" || input.run.status === "PENDING") {
    return "run_in_progress";
  }
  if (input.steps.length === 0) {
    return "no_steps_in_memory";
  }
  const withOutput = input.steps.filter((s) => s.outputChars > 0 || s.memoryKeyChars > 0);
  if (withOutput.length === 0) {
    return "empty_agent_output";
  }
  if (input.revisionsRecorded === 0 && input.steps.length > 0) {
    return "revisions_not_listed";
  }
  if (input.docsInWorkspace === 0 && withOutput.every((s) => !s.hasStructuredHandoff)) {
    const anySaved = withOutput.some(
      (s) => s.wroteDocs || Boolean(s.savedDeliverablePath?.trim()),
    );
    if (anySaved) {
      return "no_docs_on_disk";
    }
    return "no_docs_and_weak_handoff";
  }
  if (input.docsInWorkspace === 0) {
    return "no_docs_on_disk";
  }
  const withHandoff = withOutput.filter((s) => s.hasStructuredHandoff);
  if (withHandoff.length > 0 && withHandoff.length < withOutput.length) {
    return "partial_handoff";
  }
  return "ok";
}

export async function getProductLastRunTrace(
  tenantId: string,
  tenantProductId: string,
): Promise<ProductLastRunTrace | null> {
  const product = await prisma.tenantProduct.findFirst({
    where: { id: tenantProductId, tenantId },
    select: { id: true, slug: true, name: true, lastRunId: true },
  });
  if (!product) return null;

  let run: (ExecutionRun & { workflow: { name: string } }) | null = null;

  if (product.lastRunId) {
    run = await prisma.executionRun.findFirst({
      where: { id: product.lastRunId, tenantId },
      include: { workflow: { select: { name: true } } },
    });
  }

  if (!run) {
    const recent = await prisma.executionRun.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { workflow: { select: { name: true } } },
    });
    run = recent.find((r) => runMatchesProduct(r.sharedMemory, product)) ?? null;
  }

  if (!run) {
    return {
      run: null,
      steps: [],
      revisionsRecorded: 0,
      docsInWorkspace: 0,
      deliverablesSaved: 0,
      deliverablesTotal: 0,
      consensusSizeKb: 0,
      mcpToolCalls: 0,
      mcpFallbackUsed: false,
      diagnosis: "no_run",
    };
  }

  const memory = (run.sharedMemory ?? {}) as SharedMemory;
  const history = Array.isArray(memory._history) ? memory._history : [];

  const stepLogs = await prisma.executionLog.findMany({
    where: {
      runId: run.id,
      message: { startsWith: "Completed step:" },
    },
    select: { agentId: true, tokensUsed: true, payload: true },
  });

  const tokensByAgentId = new Map<string, number | null>();
  for (const log of stepLogs) {
    if (log.agentId) tokensByAgentId.set(log.agentId, log.tokensUsed);
  }

  const agentRecords = await prisma.agent.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true },
  });
  const agentIdByName = new Map(agentRecords.map((a) => [a.name, a.id]));

  const steps: ProductLastRunStepTrace[] = history.map((h, i) => {
    const output = typeof h.output === "string" ? h.output : "";
    const memoryKey =
      typeof memory[h.agentName] === "string" ? String(memory[h.agentName]) : "";
    const outputChars = output.trim().length;
    const memoryKeyChars = memoryKey.trim().length;
    const bestText = outputChars > 0 ? output : memoryKey;
    const agentId = agentIdByName.get(h.agentName);

    return {
      agentName: h.agentName,
      stepOrder: h.stepOrder ?? i + 1,
      outputChars,
      memoryKeyChars,
      hasStructuredHandoff: hasStructuredHandoff(bestText),
      wroteDocs: h.wroteDocs === true,
      savedDeliverablePath:
        typeof h.savedDeliverablePath === "string" && h.savedDeliverablePath.trim()
          ? h.savedDeliverablePath.trim()
          : null,
      deliverableStatus: resolveStepDeliverableStatus({
        outputChars,
        memoryKeyChars,
        hasStructuredHandoff: hasStructuredHandoff(bestText),
        wroteDocs: h.wroteDocs === true,
        savedDeliverablePath:
          typeof h.savedDeliverablePath === "string" ? h.savedDeliverablePath : undefined,
      }),
      outputPreview: bestText.trim().slice(0, 280),
      output: bestText.trim(),
      tokensUsed: agentId ? (tokensByAgentId.get(agentId) ?? null) : null,
    };
  });

  const consensus = await getProductConsensus(product.id);
  let revisionsRecorded = 0;
  if (consensus) {
    revisionsRecorded = await prisma.productConsensusRevision.count({
      where: { productId: consensus.id, runId: run.id },
    });
  }

  const docsIndex = await listProductAgentDocs(product.slug);
  const docsInWorkspace = docsIndex.total;

  const deliverablesSaved = steps.filter((s) => s.deliverableStatus === "saved_to_disk").length;
  const deliverablesTotal = steps.length;

  const closure = memory._runClosure as
    | {
        consensusSizeBytes?: number;
        mcpToolCalls?: number;
        mcpFallbackUsed?: boolean;
        deliverablesSaved?: number;
      }
    | undefined;
  const consensusSizeKb = Math.round(
    ((closure?.consensusSizeBytes ??
      Buffer.byteLength(consensus?.content ?? "", "utf8")) /
      1024) *
      10,
  ) / 10;
  const mcpToolCalls =
    typeof closure?.mcpToolCalls === "number"
      ? closure.mcpToolCalls
      : typeof memory._mcpToolCalls === "number"
        ? memory._mcpToolCalls
        : 0;
  const mcpFallbackUsed =
    closure?.mcpFallbackUsed === true || memory._mcpFallbackUsed === true;

  const trace: ProductLastRunTrace = {
    run: {
      id: run.id,
      status: run.status,
      workflowName: run.workflow.name,
      totalTokens: run.totalTokens,
      totalCostUsd: run.totalCostUsd,
      startedAt: run.startedAt?.toISOString() ?? null,
      completedAt: run.completedAt?.toISOString() ?? null,
      errorMessage: run.errorMessage,
      createdAt: run.createdAt.toISOString(),
    },
    steps,
    revisionsRecorded,
    docsInWorkspace,
    deliverablesSaved: closure?.deliverablesSaved ?? deliverablesSaved,
    deliverablesTotal,
    consensusSizeKb,
    mcpToolCalls,
    mcpFallbackUsed,
    diagnosis: "ok",
  };
  trace.diagnosis = buildProductLastRunDiagnosis(trace);
  return trace;
}
