/**
 * SessionProcessor — Fase 0 (camino B).
 * Worker BullMQ para el runtime de AgentSession multi-turno.
 * - Lock por tenant (serializa trabajo por inquilino).
 * - Idempotencia: reclama la sesión (PENDING → RUNNING) de forma atómica.
 * - DLQ con cola dedicada en fallos definitivos.
 */

import { Queue, Worker } from "bullmq";
import { prisma } from "../lib/prisma.js";
import { persistAndPublishRunEvent } from "../lib/run-events.js";
import { warmPlatformSettingsCache } from "../lib/platform-settings.js";
import { getRedisConnection } from "../lib/redis.js";
import { withTenantRunLock } from "../lib/tenant-run-lock.js";
import { runAgentLoop } from "../core/agent-loop/loop.js";
import { claimPendingSession } from "../lib/session-store.js";
import { SESSION_DLQ, SESSION_QUEUE, type SessionJobData } from "./queue.js";

let sessionDlq: Queue<SessionJobData> | null = null;

export function getSessionDeadLetterQueue(): Queue<SessionJobData> {
  if (!sessionDlq) {
    sessionDlq = new Queue<SessionJobData>(SESSION_DLQ, {
      connection: getRedisConnection(),
      defaultJobOptions: { removeOnComplete: 50, removeOnFail: 1000 },
    });
  }
  return sessionDlq;
}

export async function moveSessionJobToDeadLetter(data: SessionJobData, _errorMessage: string): Promise<void> {
  await getSessionDeadLetterQueue().add("failed", { ...data }, {
    jobId: `dlq-session-${data.sessionId}-${Date.now()}`,
  });
}

async function executeSessionJob(job: { data: SessionJobData }): Promise<void> {
  const { sessionId, runId, tenantId, resume, humanInput } = job.data;

  await warmPlatformSettingsCache();

  const session = await prisma.agentSession.findUnique({
    where: { id: sessionId },
    select: { id: true, runId: true, status: true, workspacePath: true, agentId: true },
  });

  if (!session) {
    await persistAndPublishRunEvent(
      { type: "error", runId: runId || sessionId, timestamp: new Date().toISOString(), data: { sessionId, error: "Session not found" } },
      tenantId,
    );
    return;
  }

  const effectiveRunId = session.runId;

  if (!effectiveRunId) {
    await persistAndPublishRunEvent(
      { type: "error", runId: sessionId, timestamp: new Date().toISOString(), data: { sessionId, error: "Session has no run" } },
      tenantId,
    );
    return;
  }

  // Idempotencia: si no es una reanudación, reclamar la sesión PENDING.
  if (!resume) {
    const claimed = await claimPendingSession(sessionId);
    if (!claimed) {
      // Ya fue procesada o está en ejecución por otro worker.
      return;
    }
    await prisma.executionRun.update({ where: { id: effectiveRunId }, data: { status: "RUNNING", startedAt: new Date() } })
      .catch(() => undefined);
  } else {
    // Reanudación desde UI (tool_approval / need_input): devolver a RUNNING
    // antes de reingresar al loop; humanInput se inyecta vía runContext.
    await prisma.agentSession
      .update({ where: { id: sessionId }, data: { status: "RUNNING", lastError: null } })
      .catch(() => undefined);
  }

  const result = await runAgentLoop({
    runContext: {
      runId: effectiveRunId,
      tenantId,
      productSlug: job.data.productSlug,
      productId: job.data.productId,
      humanInput: humanInput ?? null,
    },
    sessionId,
  });

  // Reflejar el estado terminal de la sesión en el ExecutionRun.
  // ExecutionStatus no tiene PAUSED; AWAITING_USER cubre ambas pausas humanas.
  const runStatus =
    result.status === "COMPLETED"
      ? "COMPLETED"
      : result.status === "AWAITING_INPUT" || result.status === "AWAITING_APPROVAL"
        ? "AWAITING_USER"
        : result.status === "CANCELLED"
          ? "CANCELLED"
          : "FAILED";

  await prisma.executionRun
    .update({
      where: { id: effectiveRunId },
      data: {
        status: runStatus as never,
        completedAt: runStatus === "AWAITING_USER" ? null : new Date(),
        errorMessage: result.lastError ? result.lastError.slice(0, 4000) : null,
      },
    })
    .catch(() => undefined);

  void persistAndPublishRunEvent(
    {
      type: "done",
      runId: effectiveRunId,
      timestamp: new Date().toISOString(),
      data: {
        status: result.status,
        sessionId,
        turnsExecuted: result.turnsExecuted,
        spentTokens: result.spentTokens,
        spentCostUsd: result.spentCostUsd,
        awaitingInput: result.status === "AWAITING_INPUT",
        awaitingApproval: result.status === "AWAITING_APPROVAL",
      },
    },
    tenantId,
  );

  // Finalizar el run de sesión cuando todas las sesiones estén terminales.
  if (result.status === "COMPLETED" || result.status === "FAILED" || result.status === "CANCELLED" || result.status === "BUDGET_EXCEEDED") {
    try {
      const { finalizeSessionRunIfComplete } = await import("../lib/session-run-finalizer.js");
      await finalizeSessionRunIfComplete({ runId: effectiveRunId, tenantId });
    } catch (err) {
      console.error("[session-worker] session run finalization failed:", err);
    }
  }
}

export function startSessionWorker(): Worker<SessionJobData> {
  const worker = new Worker<SessionJobData>(
    SESSION_QUEUE,
    async (job) => {
      const run = async () => executeSessionJob(job);
      if (job.data.tenantId) {
        await withTenantRunLock(job.data.tenantId, run);
      } else {
        await run();
      }
    },
    { connection: getRedisConnection(), concurrency: 2 },
  );

  worker.on("failed", async (job, err) => {
    if (!job) return;
    console.error(`Session job ${job.id} failed (attempt ${job.attemptsMade}):`, err.message);

    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade >= maxAttempts) {
      await moveSessionJobToDeadLetter(job.data, err.message).catch((dlqErr) => {
        console.error("[session-worker] DLQ enqueue failed:", dlqErr);
      });

      await prisma.agentSession
        .update({ where: { id: job.data.sessionId }, data: { status: "FAILED", lastError: err.message.slice(0, 4000), completedAt: new Date() } })
        .catch(() => undefined);

      await prisma.executionRun
        .update({ where: { id: job.data.runId }, data: { status: "FAILED", completedAt: new Date(), errorMessage: err.message.slice(0, 4000) } })
        .catch(() => undefined);

      void persistAndPublishRunEvent(
        { type: "done", runId: job.data.runId, timestamp: new Date().toISOString(), data: { status: "FAILED", sessionId: job.data.sessionId, error: err.message, deadLetter: true } },
        job.data.tenantId,
      );
    }
  });

  return worker;
}