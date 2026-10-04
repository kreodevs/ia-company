/**
 * SessionRunFinalizer — Fase 3 (camino B).
 *
 * Con el DAG congelado, el cierre de un run (sincronización de consenso,
 * product-intake, resumen, notificación) ya no vive en el executor legacy:
 * este finalizador agrega los estados terminales de las AgentSession del run
 * y ejecuta la misma cadena de post-proceso que ejecutaba el DAG.
 *
 * Se invoca desde el session processor tras cada sesión terminal; es idempotente
 * porque solo actúa cuando TODAS las sesiones del run están terminales y el
 * lock por tenant serializa los workers.
 */

import type { ExecutionStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import type { SharedMemory } from "../types/index.js";
import { WORKFLOW_NAMES } from "./workflow-names.js";
import { processConvergenceAfterRun } from "./convergence.js";
import { extractSessionWrites } from "./session-deliverables.js";
import { tenantLlmFromRecord } from "./tenant-llm.js";
import { enqueueSessionRun } from "../worker/queue.js";

const SESSION_ACTIVE: string[] = ["PENDING", "RUNNING"];
const SESSION_TERMINAL: string[] = ["COMPLETED", "FAILED", "CANCELLED", "BUDGET_EXCEEDED"];

export interface SessionRunFinalization {
  runStatus: ExecutionStatus;
  finalized: boolean;
}

/**
 * Join de las ondas del planner: cuando todas las sesiones de las ondas
 * previas están terminales, encola las sesiones PENDING de la siguiente onda
 * que aún no arrancó. Idempotente: solo libera PENDING y el lock por tenant
 * serializa la reclamación PENDING→RUNNING del worker.
 */
export async function advanceSessionWaves(input: {
  runId: string;
  tenantId?: string | null;
  productSlug?: string | null;
  productId?: string | null;
  sessions?: Array<{ id: string; agentId: string; status: string }>;
}): Promise<{ releasedSessionIds: string[]; wave: number | null }> {
  const empty = { releasedSessionIds: [], wave: null };
  const run = await prisma.executionRun.findUnique({
    where: { id: input.runId },
    select: { sharedMemory: true },
  });
  const memory = (run?.sharedMemory ?? {}) as SharedMemory;
  const waves = (
    memory.sessionPlanner as { waves?: Array<{ wave: number; agentIds: string[] }> } | undefined
  )?.waves;
  if (!waves?.length) return empty;

  const sessions =
    input.sessions ??
    (await prisma.agentSession.findMany({
      where: { runId: input.runId },
      select: { id: true, agentId: true, status: true },
    }));
  const sessionsOf = (agentIds: string[]) =>
    sessions.filter((session) => agentIds.includes(session.agentId));
  const sorted = [...waves].sort((a, b) => a.wave - b.wave);

  const target = sorted.find((wave) =>
    sessionsOf(wave.agentIds).some((s) => s.status === "PENDING"),
  );
  if (!target) return empty;

  // Join: solo se libera cuando TODAS las ondas previas quedaron terminales.
  const priorTerminal = sorted
    .filter((wave) => wave.wave < target.wave)
    .every((wave) => {
      const list = sessionsOf(wave.agentIds);
      return list.length > 0 && list.every((s) => SESSION_TERMINAL.includes(s.status));
    });
  if (!priorTerminal) return empty;

  const released: string[] = [];
  for (const session of sessionsOf(target.agentIds)) {
    if (session.status !== "PENDING") continue;
    released.push(session.id);
    await enqueueSessionRun({
      sessionId: session.id,
      runId: input.runId,
      tenantId: input.tenantId ?? undefined,
      ...(input.productSlug ? { productSlug: input.productSlug } : {}),
      ...(input.productId ? { productId: input.productId } : {}),
    });
  }
  return { releasedSessionIds: released, wave: target.wave };
}

/**
 * Agrega el estado de todas las sesiones del run. Devuelve finalized=false si
 * quedan sesiones activas o en espera humana (el run sigue abierto).
 */
export async function finalizeSessionRunIfComplete(input: {
  runId: string;
  tenantId?: string | null;
}): Promise<SessionRunFinalization> {
  const run = await prisma.executionRun.findUnique({
    where: { id: input.runId },
    include: {
      workflow: { select: { name: true } },
      sessions: {
        include: {
          agent: { select: { name: true } },
          turns: { orderBy: { turnNo: "desc" }, take: 1 },
          toolCalls: true,
        },
      },
    },
  });
  if (!run || run.engine !== "session") return { runStatus: run?.status ?? "FAILED", finalized: false };

  const sessions = run.sessions;
  if (sessions.length === 0) return { runStatus: run.status, finalized: false };

  const hasActive = sessions.some((s) => SESSION_ACTIVE.includes(s.status));
  if (hasActive) return { runStatus: "RUNNING", finalized: false };

  const awaiting = sessions.find((s) => s.status === "AWAITING_INPUT" || s.status === "AWAITING_APPROVAL");
  if (awaiting) {
    await prisma.executionRun.update({
      where: { id: run.id },
      data: { status: "AWAITING_USER", completedAt: null },
    });
    return { runStatus: "AWAITING_USER", finalized: false };
  }

  const failedSession = sessions.find((s) => s.status === "FAILED" || s.status === "BUDGET_EXCEEDED");
  const cancelledSession = sessions.find((s) => s.status === "CANCELLED");
  const aggregate: ExecutionStatus = failedSession
    ? "FAILED"
    : cancelledSession
      ? "CANCELLED"
      : "COMPLETED";

  // ── Reconstruir _history determinista desde las sesiones ──
  const memory = { ...((run.sharedMemory ?? {}) as SharedMemory) } as SharedMemory;
  const existingHistory = Array.isArray(memory._history) ? [...memory._history] : [];
  const sessionsById = new Map(existingHistory.map((h, i) => [h?.agentName ?? `#${i}`, h]));
  const history = sessions.map((session, index) => {
    const previous = sessionsById.get(session.agent.name);
    const turnOutput = session.turns[0]?.output ?? "";
    const output = session.summary?.trim() || turnOutput;
    return {
      stepId: session.id,
      agentName: session.agent.name,
      output,
      timestamp: (session.completedAt ?? session.updatedAt ?? new Date()).toISOString(),
      stepOrder: index + 1,
      wroteDocs:
        extractSessionWrites(
          session.toolCalls.map((call) => ({
            toolName: call.toolName,
            argsJson: (call.argsJson ?? {}) as Record<string, unknown>,
            resultJson: call.resultJson,
            status: call.status,
          })),
          session.agent.name,
        ).length > 0,
      ...(previous?.savedDeliverablePath ? { savedDeliverablePath: previous.savedDeliverablePath } : {}),
    };
  });
  memory._history = history;

  const totalTokens = sessions.reduce((sum, s) => sum + s.spentTokens, 0);
  const totalCostUsd = sessions.reduce((sum, s) => sum + s.spentCostUsd, 0);

  await prisma.executionRun.update({
    where: { id: run.id },
    data: {
      status: aggregate,
      completedAt: new Date(),
      errorMessage: failedSession?.lastError?.slice(0, 4000) ?? null,
      totalTokens,
      totalCostUsd,
      sharedMemory: memory as object,
    },
  });

  const workflowName = run.workflow?.name ?? "session";
  const productSlug =
    typeof memory.focusProductSlug === "string" ? memory.focusProductSlug : undefined;

  // ── Sincronización de consenso (equivalente al cierre del DAG) ──
  if (input.tenantId && run.tenantId) {
    try {
      await processConvergenceAfterRun(
        input.tenantId,
        workflowName,
        memory,
        run.id,
        productSlug,
        aggregate === "COMPLETED" ? "COMPLETED" : aggregate === "CANCELLED" ? "CANCELLED" : "FAILED",
      );
    } catch (err) {
      console.error("[session-finalizer] convergence sync failed:", err);
    }

    // ── Product intake (workflow product-intake) ──
    if (workflowName === WORKFLOW_NAMES.PRODUCT_INTAKE) {
      try {
        const { finalizeProductIntake } = await import("./product-intake.js");
        await finalizeProductIntake(input.tenantId, run.id, memory, productSlug);
      } catch (err) {
        console.error("[session-finalizer] product intake finalization failed:", err);
      }
    }
  }

  // ── Resumen del run (solo en éxito, igual que el executor DAG) ──
  if (input.tenantId && aggregate === "COMPLETED") {
    try {
      const { syncCompanyGoalProgressForRun } = await import("./objectives.js");
      await syncCompanyGoalProgressForRun(input.tenantId, {
        companyGoalId: run.companyGoalId,
      });
    } catch (err) {
      console.error("[session-finalizer] goal progress sync failed:", err);
    }
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: input.tenantId },
        include: { llmConfig: true },
      });
      const { generateAndPersistRunSummary } = await import("./run-summary.js");
      const summary = await generateAndPersistRunSummary({
        runId: run.id,
        tenantId: input.tenantId,
        workflowName,
        sharedMemory: memory,
        productSlug,
        tenantLlm: tenantLlmFromRecord(tenant?.llmConfig ?? null),
      });
      if (summary) {
        await prisma.executionRun.update({
          where: { id: run.id },
          data: {
            sharedMemory: {
              ...memory,
              runSummary: summary,
              runSummaryGeneratedAt: new Date().toISOString(),
            } as object,
          },
        });
      }
    } catch (err) {
      console.error("[session-finalizer] run summary generation failed:", err);
    }
  }

  // ── Notificación (misma que dispatchRunNotification del DAG) ──
  if (input.tenantId) {
    try {
      const { notifyRunFinished } = await import("./usage-limits.js");
      void notifyRunFinished({
        tenantId: input.tenantId,
        runId: run.id,
        status: aggregate,
        workflowName,
        totalCostUsd,
        totalTokens,
        errorMessage: failedSession?.lastError ?? null,
      });
    } catch (err) {
      console.error("[session-finalizer] notification failed:", err);
    }
  }

  return { runStatus: aggregate, finalized: true };
}
