/**
 * AgentLoop — Fase 0 (camino B).
 * Orquesta el loop multi-turno: lee la sesión, arma contexto, ejecuta turnos
 * hasta DONE verificado por criterios, HITL (need_input), presupuesto o maxTurns.
 * Emite eventos SSE y persiste checkpoints HITL.
 */

import { prisma } from "../../lib/prisma.js";
import { persistAndPublishRunEvent } from "../../lib/run-events.js";
import { createRunCheckpoint } from "../../lib/run-checkpoints.js";
import { recordWorkspaceSnapshot } from "../../lib/session-store.js";
import { snapshotSessionWorkspace } from "../../lib/workspace-session.js";
import {
  persistSessionHandoff,
  refreshSessionRollingSummary,
  shouldRefreshRollingSummary,
  type SessionMemoryContext,
} from "../../lib/session-memory.js";
import { buildToolGatewayToolSet, type ToolApprovalSignal, type ToolGatewayContext } from "../tools-gateway.js";
import { resolveSessionLlmConfig } from "../provider-router.js";
import { executeSessionTurn, type TurnExecutionContext } from "./turn-executor.js";
import { verifyAcceptance } from "./acceptance.js";
import type {
  AcceptanceCriterion,
  AgentLoopResult,
  AgentSessionConfig,
  AgentSessionStatus,
  RunContextForSession,
  SessionEventType,
} from "./types.js";
import { parseAcceptanceCriteria } from "./acceptance.js";

const MAX_TURNS_HARD_LIMIT = 100;

export interface AgentLoopOptions {
  /** Configuración inicial de la sesión (si no existe ya). */
  config?: AgentSessionConfig;
  /** Test seam; production resolves the model from the session provider config. */
  modelFactory?: TurnExecutionContext["modelFactory"];
  /** Contexto de ejecución (tenant, producto, github token, memoria). */
  runContext: RunContextForSession;
  /** Ya existe sessionId (reanudación) o se crea nueva. */
  sessionId?: string;
}

/** Estado interno del loop para reanudación. */
interface LoopState {
  sessionId: string;
  runId: string;
  tenantId: string | null;
  agentId: string;
  agentName: string;
  goal: string;
  acceptanceCriteria: AcceptanceCriterion[];
  workspacePath: string;
  maxTurns: number;
  budgetTokens: number | null;
  budgetUsd: number | null;
  spentTokens: number;
  spentCostUsd: number;
  currentTurn: number;
  status: AgentSessionStatus;
  tools: ToolSet;
  llmConfig: Awaited<ReturnType<typeof resolveSessionLlmConfig>>;
  modelFactory?: TurnExecutionContext["modelFactory"];
  feedback: string | null;
  humanInput: string | null;
  approvalSignal: ToolApprovalSignal;
  /** Product context for session memory / handoff persistence. */
  productId?: string | null;
  productSlug?: string | null;
  /** Rolling memory summary, refreshed every ROLLING_SUMMARY_INTERVAL turns. */
  rollingSummary: string | null;
}

/** Importación diferida de ToolSet para evitar circularidad. */
import type { ToolSet } from "ai";

export async function runAgentLoop(options: AgentLoopOptions): Promise<AgentLoopResult> {
  const { runContext, sessionId: providedSessionId, config } = options;
  const { runId, tenantId, productSlug, productId, githubToken, sharedMemory } = runContext;

  // ── 1. Cargar o crear sesión ──────────────────────────────────────────────
  let session;
  if (providedSessionId) {
    session = await prisma.agentSession.findUnique({
      where: { id: providedSessionId },
      include: { run: true, agent: true, turns: { orderBy: { turnNo: "asc" } } },
    });
    if (!session) throw new Error(`Session ${providedSessionId} not found`);
    if (session.runId !== runId) throw new Error(`Session ${providedSessionId} belongs to different run`);
  } else if (config) {
    session = await prisma.agentSession.create({
      data: {
        runId,
        tenantId: config.tenantId ?? tenantId ?? null,
        agentId: config.agentId,
        status: "RUNNING",
        role: config.role ?? "",
        goal: config.goal,
        acceptanceCriteria: (config.acceptanceCriteria ?? []) as never,
        workspacePath: config.workspacePath,
        provider: config.provider ?? null,
        model: config.model ?? null,
        maxTurns: config.maxTurns ?? 25,
        budgetTokens: config.budgetTokens ?? null,
        budgetUsd: config.budgetUsd ?? null,
        startedAt: new Date(),
      },
      include: { agent: true },
    });
  } else {
    throw new Error("Either sessionId or config must be provided");
  }

  // ── 2. Resolver modelo tool-capable con fallback ───────────────────────────
  const llmConfig = await resolveSessionLlmConfig({
    agent: {
      provider: (session.provider ?? null) as AgentSessionConfig["provider"],
      model: session.model,
      modelKind: session.agent.modelKind,
      temperature: session.agent.temperature,
    },
    tenantId,
  });

  // ── 3. Construir ToolGateway (AI SDK ToolSet) ─────────────────────────────
  const approvalSignal: ToolApprovalSignal = { requested: false };
  const gatewayCtx: ToolGatewayContext = {
    runId,
    tenantId: session.tenantId ?? tenantId,
    agentId: session.agentId,
    agentName: session.agent.name,
    sessionId: session.id,
    workspaceRoot: session.workspacePath,
    shellTimeoutMs: 120_000,
    productSlug,
    productId,
    githubToken,
    sharedMemory,
    approvalSignal,
  };
  const tools = await buildToolGatewayToolSet(gatewayCtx);

  // ── 4. Estado y loop ──────────────────────────────────────────────────────
  const state: LoopState = {
    sessionId: session.id,
    runId,
    tenantId: session.tenantId,
    agentId: session.agentId,
    agentName: session.agent.name,
    goal: session.goal,
    acceptanceCriteria: parseAcceptanceCriteria(session.acceptanceCriteria),
    workspacePath: session.workspacePath,
    maxTurns: Math.min(session.maxTurns, MAX_TURNS_HARD_LIMIT),
    budgetTokens: session.budgetTokens,
    budgetUsd: session.budgetUsd,
    spentTokens: session.spentTokens,
    spentCostUsd: session.spentCostUsd,
    currentTurn: session.currentTurn,
    status: session.status,
    tools,
    llmConfig,
    modelFactory: options.modelFactory,
    feedback: null,
    humanInput: runContext.humanInput ?? null,
    approvalSignal,
    productId,
    productSlug,
    rollingSummary: session.summary ?? null,
  };

  // Notificar inicio de sesión
  await emitSessionEvent(state, "session_started", {
    sessionId: session.id,
    agentName: session.agent.name,
    goal: session.goal,
  });

  // Loop principal
  while (state.currentTurn < state.maxTurns) {
    // Límite de presupuesto → checkpoint budget_exceeded + pausar
    if (state.budgetTokens && state.spentTokens >= state.budgetTokens) {
      const reason = `Token budget exceeded (${state.spentTokens}/${state.budgetTokens} tokens)`;
      await handleBudgetExceeded(state, reason);
      return makeResult(state, "BUDGET_EXCEEDED", reason);
    }
    if (state.budgetUsd && state.spentCostUsd >= state.budgetUsd) {
      const reason = `Cost budget exceeded ($${state.spentCostUsd.toFixed(4)}/$${state.budgetUsd.toFixed(4)})`;
      await handleBudgetExceeded(state, reason);
      return makeResult(state, "BUDGET_EXCEEDED", reason);
    }

    const turnNo = state.currentTurn + 1;
    await emitSessionEvent(state, "turn_started", {
      sessionId: state.sessionId,
      turnNo,
      goal: state.goal,
    });
    const turnInput = buildTurnInput(state, turnNo);

    // Ejecutar turno — historial fresco en cada iteración
    const priorTurns = await prisma.sessionTurn.findMany({
      where: { sessionId: state.sessionId },
      orderBy: { turnNo: "asc" },
      select: { turnNo: true, input: true, output: true },
    });
    const turnCtx: TurnExecutionContext = {
      runId,
      sessionId: state.sessionId,
      agent: { id: state.agentId, name: state.agentName, role: session.role, temperature: session.agent.temperature },
      llm: state.llmConfig.config,
      tools: state.tools,
      goal: state.goal,
      acceptanceCriteria: state.acceptanceCriteria,
      workspacePath: state.workspacePath,
      historyTurns: priorTurns,
      maxStepsPerTurn: 12,
      modelFactory: state.modelFactory,
    };

    let turnResult;
    try {
      turnResult = await executeSessionTurn(turnCtx, turnInput);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Turn execution failed";
      await failSession(state, "FAILED", message);
      return makeResult(state, "FAILED", message);
    }

    // Actualizar gasto
    state.spentTokens += turnResult.tokens;
    state.spentCostUsd += turnResult.costUsd;
    state.currentTurn = turnNo;

    // SessionMemory: refrescar el resumen rolling cada N turnos (best-effort).
    if (shouldRefreshRollingSummary(turnNo)) {
      try {
        state.rollingSummary = await refreshSessionRollingSummary(
          buildMemoryContext(state),
          state.rollingSummary,
        );
        await emitSessionEvent(state, "session_memory_updated", {
          turnNo,
          summaryChars: state.rollingSummary.length,
        });
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Rolling summary refresh failed";
        await emitSessionEvent(state, "session_memory_updated", { turnNo, error: detail });
      }
    }

    // HITL: tool_approval → pausar sesión; el humano resuelve el checkpoint.
    if (state.approvalSignal.requested) {
      const detail = state.approvalSignal.toolName
        ? `Tool "${state.approvalSignal.toolName}" requires human approval${state.approvalSignal.command ? `: ${state.approvalSignal.command}` : ""}`
        : "A tool call requires human approval";
      await handleToolApproval(state, detail);
      return makeResult(state, "AWAITING_APPROVAL", detail);
    }

    // Veto de Munger → detener
    if (turnResult.veto) {
      await failSession(state, "FAILED", `VETO: ${turnResult.veto.reason}`);
      return makeResult(state, "FAILED", `VETO: ${turnResult.veto.reason}`);
    }

    // HITL: need_input → checkpoint + pausar
    if (turnResult.needInput) {
      await handleNeedInput(state, turnResult.needInput.prompt);
      return makeResult(state, "AWAITING_INPUT", `Awaiting human input: ${turnResult.needInput.prompt}`);
    }

    // El modelo marcó DONE → verificar criterios de forma determinista
    if (turnResult.doneMarker) {
      const report = await verifyAcceptance(
        state.acceptanceCriteria,
        state.workspacePath,
        {},
      );
      if (report.allPassed) {
        await completeSession(
          state,
          turnResult.doneSummary ?? "Session completed successfully",
          turnResult.output,
        );
        return makeResult(state, "COMPLETED", turnResult.doneSummary ?? "Session completed successfully");
      }
      // Criterios no cumplidos: forzar siguiente turno con feedback
      state.feedback = `Your last turn claimed completion (SESSION_DONE) but verification failed:\n${report.checks
        .filter((c) => !c.passed)
        .map((c) => `- [${c.id}] ${c.description}: ${c.detail}`)
        .join("\n")}\n\nFix the gaps and continue. Do NOT emit SESSION_DONE again until ALL criteria pass.`;
      continue;
    }

    // Sin marker: iterar (el modelo seguirá pidiendo herramientas)
  }

  // MaxTurns alcanzado
  await failSession(state, "FAILED", `Max turns (${state.maxTurns}) reached`);
  return makeResult(state, "FAILED", `Max turns (${state.maxTurns}) reached`);
}

function buildTurnInput(state: LoopState, turnNo: number): string {
  const feedback = state.feedback ? `\n\nVERIFICATION FEEDBACK:\n${state.feedback}` : "";
  const resumed = state.humanInput
    ? `\n\nHUMAN INPUT (checkpoint response — incorporate it now and continue):\n${state.humanInput}\n`
    : "";
  const memory = state.rollingSummary
    ? `\n\nSESSION MEMORY (rolling summary of earlier work):\n${state.rollingSummary.slice(0, 4000)}\n`
    : "";
  if (turnNo === 1) {
    return `SESSION START — TURN 1

Goal: ${state.goal}

Begin working now. Read the workspace, understand the current state, and take your first concrete step toward the goal. Remember: you must verify EVERY acceptance criterion before finishing.${memory}${resumed}${feedback}`;
  }
  return `TURN ${turnNo} — Continue working toward the goal. Read before writing. Do not repeat work.${memory}${resumed}${feedback}`;
}

function buildMemoryContext(state: LoopState): SessionMemoryContext {
  return {
    sessionId: state.sessionId,
    runId: state.runId,
    tenantId: state.tenantId,
    agentName: state.agentName,
    productId: state.productId,
    productSlug: state.productSlug,
  };
}

async function emitSessionEvent(state: LoopState, type: SessionEventType, data: Record<string, unknown>): Promise<void> {
  await persistAndPublishRunEvent(
    {
      type: "log",
      runId: state.runId,
      timestamp: new Date().toISOString(),
      data: { sessionEvent: type, sessionId: state.sessionId, ...data },
    },
    state.tenantId,
  );
}

async function failSession(state: LoopState, status: AgentSessionStatus, error: string): Promise<void> {
  await prisma.agentSession.update({
    where: { id: state.sessionId },
    data: { status, lastError: error, completedAt: new Date(), spentTokens: state.spentTokens, spentCostUsd: state.spentCostUsd },
  });
  await emitSessionEvent(state, "session_failed", { sessionId: state.sessionId, error });
}

async function completeSession(
  state: LoopState,
  summary: string,
  finalOutput?: string | null,
): Promise<void> {
  // Snapshot versionado (git commit si hay cambios + commitSha persistido).
  const snapshot = await snapshotSessionWorkspace(state.workspacePath);
  await recordWorkspaceSnapshot({
    sessionId: state.sessionId,
    runId: state.runId,
    filesChanged: snapshot.filesChanged,
    manifest: snapshot.manifest,
    totalBytes: snapshot.totalBytes,
    commitSha: snapshot.commitSha ?? null,
  });
  await prisma.agentSession.update({
    where: { id: state.sessionId },
    data: { status: "COMPLETED", summary, completedAt: new Date(), spentTokens: state.spentTokens, spentCostUsd: state.spentCostUsd },
  });

  // Handoff estructurado agente→agente hacia ProductConsensusRevision (best-effort).
  if (finalOutput && finalOutput.trim()) {
    try {
      await persistSessionHandoff(buildMemoryContext(state), finalOutput, state.currentTurn);
      await emitSessionEvent(state, "session_handoff", {
        agentName: state.agentName,
        stepOrder: state.currentTurn,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Handoff persistence failed";
      await emitSessionEvent(state, "session_handoff", {
        agentName: state.agentName,
        error: detail,
      });
    }
  }

  await emitSessionEvent(state, "session_completed", {
    sessionId: state.sessionId,
    summary,
    filesChanged: snapshot.filesChanged.length,
    commitSha: snapshot.commitSha ?? null,
  });
}

async function handleBudgetExceeded(state: LoopState, reason: string): Promise<void> {
  await prisma.agentSession.update({
    where: { id: state.sessionId },
    data: {
      status: "BUDGET_EXCEEDED",
      lastError: reason,
      completedAt: new Date(),
      spentTokens: state.spentTokens,
      spentCostUsd: state.spentCostUsd,
    },
  });
  await createRunCheckpoint({
    runId: state.runId,
    tenantId: state.tenantId ?? undefined,
    kind: "budget_exceeded",
    payload: {
      sessionId: state.sessionId,
      reason,
      budgetTokens: state.budgetTokens,
      budgetUsd: state.budgetUsd,
      spentTokens: state.spentTokens,
      spentCostUsd: state.spentCostUsd,
    },
  });
  await emitSessionEvent(state, "budget_exceeded", {
    sessionId: state.sessionId,
    reason,
    spentTokens: state.spentTokens,
    spentCostUsd: state.spentCostUsd,
    budgetTokens: state.budgetTokens,
    budgetUsd: state.budgetUsd,
  });
}

async function handleToolApproval(state: LoopState, reason: string): Promise<void> {
  await prisma.agentSession.update({
    where: { id: state.sessionId },
    data: { status: "AWAITING_APPROVAL", spentTokens: state.spentTokens, spentCostUsd: state.spentCostUsd },
  });
  await emitSessionEvent(state, "tool_approval", { sessionId: state.sessionId, reason });
}

async function handleNeedInput(state: LoopState, prompt: string): Promise<void> {
  await prisma.agentSession.update({
    where: { id: state.sessionId },
    data: { status: "AWAITING_INPUT", spentTokens: state.spentTokens, spentCostUsd: state.spentCostUsd },
  });
  // Crear checkpoint HITL tipo need_input
  await createRunCheckpoint({
    runId: state.runId,
    tenantId: state.tenantId ?? undefined,
    kind: "need_input",
    payload: { sessionId: state.sessionId, prompt },
  });
  await emitSessionEvent(state, "need_input", { sessionId: state.sessionId, prompt });
}

function makeResult(state: LoopState, status: AgentSessionStatus, lastError?: string): AgentLoopResult {
  return {
    sessionId: state.sessionId,
    status,
    turnsExecuted: state.currentTurn,
    spentTokens: state.spentTokens,
    spentCostUsd: state.spentCostUsd,
    summary: status === "COMPLETED" ? state.goal : null,
    lastError: lastError ?? null,
  };
}