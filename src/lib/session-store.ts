import { prisma } from "./prisma.js";
import { Prisma } from "@prisma/client";
import type { AgentSession } from "@prisma/client";
import type {
  AgentSessionConfig,
  AgentSessionStatus,
  SessionToolCallRecord,
} from "../core/agent-loop/types.js";

/**
 * Persistence layer for the multi-turn AgentSession runtime.
 * All writes for sessions / turns / tool-calls go through here so the
 * agent loop and the worker stay decoupled from Prisma details.
 */

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function createAgentSession(input: {
  config: AgentSessionConfig;
  status?: AgentSessionStatus;
}): Promise<AgentSession> {
  const { config } = input;
  return prisma.agentSession.create({
    data: {
      runId: config.runId,
      tenantId: config.tenantId ?? null,
      agentId: config.agentId,
      status: input.status ?? "PENDING",
      role: config.role ?? "",
      goal: config.goal,
      acceptanceCriteria: (config.acceptanceCriteria ?? []) as unknown as Prisma.InputJsonValue,
      workspacePath: config.workspacePath,
      provider: config.provider ?? null,
      model: config.model ?? null,
      maxTurns: config.maxTurns ?? 25,
      budgetTokens: config.budgetTokens ?? null,
      budgetUsd: config.budgetUsd ?? null,
    },
  });
}

export async function getAgentSession(sessionId: string): Promise<AgentSession | null> {
  return prisma.agentSession.findUnique({ where: { id: sessionId } });
}

export async function getAgentSessionWithTurns(sessionId: string) {
  return prisma.agentSession.findUnique({
    where: { id: sessionId },
    include: {
      turns: { orderBy: { turnNo: "asc" }, include: { toolCalls: { orderBy: { createdAt: "asc" } } } },
      snapshots: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export async function updateAgentSession(
  sessionId: string,
  data: Prisma.AgentSessionUpdateInput,
): Promise<AgentSession> {
  return prisma.agentSession.update({ where: { id: sessionId }, data });
}

/** Atomically claim a PENDING session for execution (idempotency guard). */
export async function claimPendingSession(sessionId: string): Promise<AgentSession | null> {
  const claimed = await prisma.agentSession.updateMany({
    where: { id: sessionId, status: "PENDING" },
    data: { status: "RUNNING", startedAt: new Date() },
  });
  if (claimed.count === 0) return null;
  return prisma.agentSession.findUnique({ where: { id: sessionId } });
}

// ---------------------------------------------------------------------------
// Turns
// ---------------------------------------------------------------------------

export async function startSessionTurn(input: {
  sessionId: string;
  turnNo: number;
  input: string;
}): Promise<{ id: string }> {
  const turn = await prisma.sessionTurn.create({
    data: {
      sessionId: input.sessionId,
      turnNo: input.turnNo,
      input: input.input,
    },
    select: { id: true },
  });
  return turn;
}

export async function finishSessionTurn(input: {
  turnId: string;
  output: string | null;
  tokens: number;
  costUsd: number;
}): Promise<void> {
  await prisma.sessionTurn.update({
    where: { id: input.turnId },
    data: {
      output: input.output,
      tokens: input.tokens,
      costUsd: input.costUsd,
      endedAt: new Date(),
    },
  });
}

export async function getLatestTurnNo(sessionId: string): Promise<number> {
  const last = await prisma.sessionTurn.findFirst({
    where: { sessionId },
    orderBy: { turnNo: "desc" },
    select: { turnNo: true },
  });
  return last?.turnNo ?? 0;
}

export async function listSessionTurns(sessionId: string) {
  return prisma.sessionTurn.findMany({
    where: { sessionId },
    orderBy: { turnNo: "asc" },
    include: { toolCalls: { orderBy: { createdAt: "asc" } } },
  });
}

// ---------------------------------------------------------------------------
// Tool calls
// ---------------------------------------------------------------------------

export async function recordSessionToolCall(input: {
  sessionId: string;
  turnId: string;
  record: SessionToolCallRecord;
}): Promise<void> {
  const { record } = input;
  await prisma.sessionToolCall.create({
    data: {
      sessionId: input.sessionId,
      turnId: input.turnId,
      toolName: record.toolName,
      argsJson: record.argsJson as Prisma.InputJsonValue,
      resultJson:
        record.resultJson === undefined || record.resultJson === null
          ? Prisma.DbNull
          : (record.resultJson as Prisma.InputJsonValue),
      exitCode: record.exitCode ?? null,
      durationMs: record.durationMs ?? null,
      status: record.status,
      error: record.error ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

export async function recordWorkspaceSnapshot(input: {
  sessionId: string;
  runId: string;
  filesChanged: string[];
  manifest: Record<string, unknown>;
  totalBytes: number;
  commitSha?: string | null;
}): Promise<void> {
  await prisma.workspaceSnapshot.create({
    data: {
      sessionId: input.sessionId,
      runId: input.runId,
      filesChanged: input.filesChanged,
      manifest: input.manifest as Prisma.InputJsonValue,
      commitSha: input.commitSha ?? null,
      totalBytes: input.totalBytes,
    },
  });
}

// ---------------------------------------------------------------------------
// Aggregates / queries
// ---------------------------------------------------------------------------

export async function listSessionsForRun(runId: string): Promise<AgentSession[]> {
  return prisma.agentSession.findMany({ where: { runId }, orderBy: { createdAt: "asc" } });
}

export async function listActiveSessionsForTenant(tenantId: string): Promise<AgentSession[]> {
  return prisma.agentSession.findMany({
    where: { tenantId, status: { in: ["PENDING", "RUNNING", "AWAITING_INPUT", "AWAITING_APPROVAL"] } },
    orderBy: { createdAt: "asc" },
  });
}

/** Accumulated spend for budget checks (tokens + cost across turns). */
export async function getSessionSpend(sessionId: string): Promise<{ tokens: number; costUsd: number }> {
  const agg = await prisma.sessionTurn.aggregate({
    where: { sessionId },
    _sum: { tokens: true, costUsd: true },
  });
  return {
    tokens: agg._sum.tokens ?? 0,
    costUsd: agg._sum.costUsd ?? 0,
  };
}
