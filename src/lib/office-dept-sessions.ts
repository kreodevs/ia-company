/**
 * Fase 4 — Oficina completa Paperclip.
 * Sesiones visibles por sala de departamento / ficha de especialista.
 *
 * Un encargo (ExecutionRun) pertenece a una sala por orgUnitId explícito o por
 * roster de agentes virtuales; las AgentSession heredan la sala vía su run.
 */

import type { AgentSessionStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { VIRTUAL_OFFICE_DEPARTMENTS } from "./office-departments.js";
import { suggestedAgentsFromOrgRecord } from "./org-context.js";
import { buildDepartmentRunScopeWhere } from "./office-run-department.js";
import { extractRunTaskPreview } from "./product-run-association.js";
import { summarizeToolCallsForSessions } from "./session-store.js";

export interface OfficeDeptSessionSummary {
  id: string;
  runId: string;
  agentId: string;
  agentName: string | null;
  role: string;
  status: string;
  goal: string;
  currentTurn: number;
  maxTurns: number;
  spentTokens: number;
  spentCostUsd: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  encargoTitle: string | null;
}

export interface ListScopedSessionsInput {
  departmentSlug?: string | null;
  orgUnitId?: string | null;
  agentName?: string | null;
  limit?: number;
  /** Solo sesiones vivas (default: activas primero, luego recientes). */
  activeOnly?: boolean;
}

const ACTIVE_SESSION_STATUSES: AgentSessionStatus[] = [
  "PENDING",
  "RUNNING",
  "AWAITING_INPUT",
  "AWAITING_APPROVAL",
];

export async function resolveDepartmentRoster(input: {
  departmentSlug?: string | null;
  orgUnitId?: string | null;
}): Promise<string[]> {
  if (input.orgUnitId) {
    const org = await prisma.orgUnit.findFirst({
      where: { id: input.orgUnitId },
      include: { template: true },
    });
    if (org) return suggestedAgentsFromOrgRecord(org);
  }
  if (input.departmentSlug) {
    const dept = VIRTUAL_OFFICE_DEPARTMENTS.find((d) => d.slug === input.departmentSlug);
    if (dept) return [...dept.agentNames];
  }
  return [];
}

/** Sesiones de la sala (dept virtual u orgUnit), opcionalmente de un agente. */
export async function listScopedSessions(
  tenantId: string,
  input: ListScopedSessionsInput = {},
): Promise<OfficeDeptSessionSummary[]> {
  const limit = Math.min(50, Math.max(1, input.limit ?? 20));
  const roster = await resolveDepartmentRoster({
    departmentSlug: input.departmentSlug,
    orgUnitId: input.orgUnitId,
  });
  const agentNameFilter = input.agentName?.trim() || null;

  const scopeWhere = buildDepartmentRunScopeWhere({
    orgUnitId: input.orgUnitId ?? null,
    rosterNames: roster.length ? roster : undefined,
  });

  const runs = await prisma.executionRun.findMany({
    where: { tenantId, ...(scopeWhere ?? {}) },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: { id: true, sharedMemory: true },
  });
  const memoryByRunId = new Map(runs.map((r) => [r.id, r.sharedMemory]));

  const sessions = await prisma.agentSession.findMany({
    where: {
      runId: { in: runs.map((r) => r.id) },
      ...(roster.length || agentNameFilter
        ? { agent: { is: { name: { in: agentNameFilter ? [agentNameFilter] : roster } } } }
        : {}),
      ...(input.activeOnly ? { status: { in: ACTIVE_SESSION_STATUSES } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { agent: { select: { name: true } } },
  });

  // Activas primero, luego recientes (la sala vive de lo que está trabajando).
  const rank = (status: AgentSessionStatus) => (ACTIVE_SESSION_STATUSES.includes(status) ? 0 : 1);
  const ordered = [...sessions].sort((a, b) => rank(a.status) - rank(b.status));

  return ordered.map((session) => ({
    id: session.id,
    runId: session.runId,
    agentId: session.agentId,
    agentName: session.agent?.name ?? null,
    role: session.role,
    status: session.status,
    goal: session.goal,
    currentTurn: session.currentTurn,
    maxTurns: session.maxTurns,
    spentTokens: session.spentTokens,
    spentCostUsd: session.spentCostUsd,
    startedAt: session.startedAt?.toISOString() ?? null,
    completedAt: session.completedAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    encargoTitle: extractRunTaskPreview(memoryByRunId.get(session.runId) ?? null),
  }));
}

/** Ficha de especialista: sesiones recientes + resumen de tools + costo total. */
export async function getSpecialistSessionsSummary(
  tenantId: string,
  agentName: string,
  options: { limit?: number } = {},
): Promise<{
  agent: { id: string; name: string; role: string; isActive: boolean } | null;
  sessions: OfficeDeptSessionSummary[];
  tools: Array<{ toolName: string; count: number; lastUsedAt: string | null }>;
  totals: { spentTokens: number; spentCostUsd: number; sessions: number };
} | null> {
  const agent = await prisma.agent.findFirst({
    where: { tenantId, name: agentName },
    select: { id: true, name: true, role: true, isActive: true },
  });
  if (!agent) return null;

  const sessions = await listScopedSessions(tenantId, { agentName, limit: options.limit ?? 10 });
  const tools = await summarizeToolCallsForSessions(sessions.map((s) => s.id));
  const totals = {
    spentTokens: sessions.reduce((sum, s) => sum + s.spentTokens, 0),
    spentCostUsd: Number(sessions.reduce((sum, s) => sum + s.spentCostUsd, 0).toFixed(4)),
    sessions: sessions.length,
  };
  return { agent, sessions, tools, totals };
}