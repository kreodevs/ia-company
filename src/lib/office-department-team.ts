import type { ExecutionStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { suggestedAgentsFromOrgRecord } from "./org-context.js";
import {
  VIRTUAL_OFFICE_DEPARTMENTS,
  type VirtualOfficeDepartmentDef,
} from "./office-departments.js";
import { encargoActivityFields } from "./office-encargos.js";
import {
  runBelongsToDepartmentRoster,
} from "./office-run-department.js";
import { extractRunTaskPreview } from "./product-run-association.js";
import type { SharedMemory } from "../types/index.js";

const ACTIVE_STATUSES: ExecutionStatus[] = ["PENDING", "RUNNING", "DELEGATED", "AWAITING_USER"];

const runInclude = {
  workflow: {
    select: {
      name: true,
      steps: {
        select: { agent: { select: { name: true } } },
        orderBy: { stepOrder: "asc" as const },
      },
    },
  },
  logs: {
    where: { agentId: { not: null } },
    orderBy: { createdAt: "desc" as const },
    take: 30,
    select: {
      id: true,
      level: true,
      message: true,
      agentId: true,
      stepId: true,
      createdAt: true,
    },
  },
};

type RunRow = Awaited<ReturnType<typeof prisma.executionRun.findMany>>[number] & {
  workflow: {
    name: string;
    steps: Array<{ agent: { name: string } | null }>;
  };
  logs: Array<{
    id: string;
    level: string;
    message: string;
    agentId: string | null;
    stepId: string | null;
    createdAt: Date;
  }>;
};

function workflowAgentNamesFromRun(run: RunRow): string[] {
  return run.workflow.steps
    .map((step) => step.agent?.name)
    .filter((name): name is string => typeof name === "string");
}

function runBelongsToDepartment(
  run: RunRow,
  roster: Set<string>,
  orgUnitId: string | null,
): boolean {
  return runBelongsToDepartmentRoster({
    sharedMemory: run.sharedMemory,
    rosterNames: [...roster],
    orgUnitId,
    workflowAgentNames: workflowAgentNamesFromRun(run),
  });
}

export interface DepartmentTeamAgent {
  id: string;
  name: string;
  role: string;
  status: "idle" | "thinking" | "queued";
  currentTask: string | null;
  lastWorkedAt: string | null;
  lastMessage: string | null;
}

export interface DepartmentTeamActiveRun {
  id: string;
  workflowName: string;
  status: string;
  startedAt: string | null;
  agentIds: string[];
  task: string | null;
  errorMessage: string | null;
  procedureLabel: string;
  productId: string | null;
  productName: string | null;
}

export interface DepartmentTeamPayload {
  department: {
    slug: string | null;
    name: string;
    kind: "virtual" | "org_unit";
    emoji: string;
    orgUnitId: string | null;
    href: string;
  };
  activeRun: DepartmentTeamActiveRun | null;
  activeRuns: Array<{
    id: string;
    workflowName: string;
    status: string;
    startedAt: string | null;
    agentIds: string[];
    task: string | null;
    procedureLabel: string;
  }>;
  recentRuns: Array<{
    id: string;
    status: string;
    workflowName: string;
    startedAt: string | null;
    completedAt: string | null;
    totalTokens: number;
    totalCostUsd: number;
    errorMessage: string | null;
  }>;
  team: DepartmentTeamAgent[];
  procedureLabel: string | null;
}

function memoryCurrentAgentId(memory: unknown): string | null {
  if (!memory || typeof memory !== "object") return null;
  const id = (memory as { currentAgentId?: unknown }).currentAgentId;
  return typeof id === "string" ? id : null;
}

function buildActiveRunSummary(
  run: RunRow,
  orgUnitNameById: Map<string, string>,
  products: Array<{ id: string; name: string; slug: string }>,
) {
  const agentIds = new Set<string>();
  for (const log of run.logs) {
    if (log.agentId) agentIds.add(log.agentId);
  }
  const memory = (run.sharedMemory ?? {}) as SharedMemory;
  const fields = encargoActivityFields({
    workflowName: run.workflow.name,
    sharedMemory: memory,
    orgUnitNameById,
  });
  const productSlug =
    typeof memory.focusProductSlug === "string" ? memory.focusProductSlug : null;
  const product = productSlug ? products.find((p) => p.slug === productSlug) : null;

  return {
    id: run.id,
    workflowName: run.workflow.name,
    status: run.status,
    startedAt: run.startedAt?.toISOString() ?? null,
    agentIds: Array.from(agentIds),
    task: extractRunTaskPreview(run.sharedMemory),
    procedureLabel: fields.procedureLabel,
    errorMessage: run.errorMessage,
    productId: product?.id ?? null,
    productName: product?.name ?? null,
    fields,
  };
}

function buildTeamForRun(
  rosterAgents: Array<{ id: string; name: string; role: string }>,
  activeRun: RunRow | null,
): DepartmentTeamAgent[] {
  const lastWorkedAt = new Map<string, { at: Date; message: string }>();
  if (activeRun) {
    for (const log of activeRun.logs) {
      if (!log.agentId) continue;
      const existing = lastWorkedAt.get(log.agentId);
      if (!existing || log.createdAt > existing.at) {
        lastWorkedAt.set(log.agentId, { at: log.createdAt, message: log.message });
      }
    }
  }

  const currentAgentId = activeRun ? memoryCurrentAgentId(activeRun.sharedMemory) : null;

  return rosterAgents.map((agent) => {
    const lastWork = lastWorkedAt.get(agent.id);
    let status: DepartmentTeamAgent["status"] = "idle";
    if (activeRun && activeRun.status === "PENDING") {
      status = "queued";
    } else if (
      activeRun &&
      ["RUNNING", "DELEGATED"].includes(activeRun.status) &&
      currentAgentId === agent.id
    ) {
      status = "thinking";
    } else if (
      activeRun &&
      ["RUNNING", "DELEGATED"].includes(activeRun.status) &&
      !currentAgentId &&
      lastWork
    ) {
      status = "thinking";
    }
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      status,
      currentTask:
        status === "thinking" && lastWork ? lastWork.message.slice(0, 120) : null,
      lastWorkedAt: lastWork ? lastWork.at.toISOString() : null,
      lastMessage: lastWork ? lastWork.message.slice(0, 200) : null,
    };
  });
}

async function loadDepartmentContext(
  tenantId: string,
  input: { departmentSlug?: string; orgUnitId?: string },
): Promise<{
  def: VirtualOfficeDepartmentDef | null;
  orgUnit: {
    id: string;
    slug: string;
    name: string;
    config: unknown;
    template: { definition: unknown } | null;
  } | null;
  rosterNames: string[];
  departmentMeta: DepartmentTeamPayload["department"];
} | null> {
  if (input.orgUnitId) {
    const orgUnit = await prisma.orgUnit.findFirst({
      where: { id: input.orgUnitId, tenantId, isActive: true },
      include: { template: { select: { definition: true } } },
    });
    if (!orgUnit) return null;
    const rosterNames = suggestedAgentsFromOrgRecord(orgUnit);
    return {
      def: null,
      orgUnit,
      rosterNames,
      departmentMeta: {
        slug: orgUnit.slug,
        name: orgUnit.name,
        kind: "org_unit",
        emoji: "🏢",
        orgUnitId: orgUnit.id,
        href: `/org-units/${orgUnit.id}`,
      },
    };
  }

  const slug = input.departmentSlug?.trim();
  if (!slug) return null;
  const def = VIRTUAL_OFFICE_DEPARTMENTS.find((d) => d.slug === slug);
  if (!def) return null;
  return {
    def,
    orgUnit: null,
    rosterNames: def.agentNames,
    departmentMeta: {
      slug: def.slug,
      name: def.slug,
      kind: "virtual",
      emoji: def.emoji,
      orgUnitId: null,
      href: `/office/departments/${def.slug}`,
    },
  };
}

export async function getDepartmentTeam(
  tenantId: string,
  input: { departmentSlug?: string; orgUnitId?: string; watchRunId?: string | null },
): Promise<DepartmentTeamPayload | null> {
  const ctx = await loadDepartmentContext(tenantId, input);
  if (!ctx) return null;

  const rosterSet = new Set(ctx.rosterNames);
  const [agents, activeRunsQuery, recentRunsQuery, orgUnits, products] = await Promise.all([
    prisma.agent.findMany({
      where: { tenantId, isActive: true, name: { in: ctx.rosterNames } },
      orderBy: { name: "asc" },
    }),
    prisma.executionRun.findMany({
      where: { tenantId, status: { in: ACTIVE_STATUSES } },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: runInclude,
    }),
    prisma.executionRun.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: runInclude,
    }),
    prisma.orgUnit.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
    }),
    prisma.tenantProduct.findMany({
      where: { tenantId, phase: { not: "archived" } },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  const orgUnitNameById = new Map(orgUnits.map((o) => [o.id, o.name]));
  const deptOrgUnitId = ctx.orgUnit?.id ?? null;

  const deptActiveRuns = activeRunsQuery.filter((run) =>
    runBelongsToDepartment(run as RunRow, rosterSet, deptOrgUnitId),
  );
  const deptRecentRuns = recentRunsQuery.filter((run) =>
    runBelongsToDepartment(run as RunRow, rosterSet, deptOrgUnitId),
  );

  const watchRunId = input.watchRunId?.trim() || null;
  let activeRun =
    (watchRunId ? deptActiveRuns.find((r) => r.id === watchRunId) : null) ??
    deptActiveRuns[0] ??
    null;

  if (watchRunId && !activeRun) {
    const watched = await prisma.executionRun.findFirst({
      where: { id: watchRunId, tenantId },
      include: runInclude,
    });
    if (
      watched &&
      ACTIVE_STATUSES.includes(watched.status as ExecutionStatus) &&
      runBelongsToDepartment(watched as RunRow, rosterSet, deptOrgUnitId)
    ) {
      activeRun = watched;
    }
  }

  const activeRuns = deptActiveRuns.map((run) => {
    const summary = buildActiveRunSummary(run as RunRow, orgUnitNameById, products);
    return {
      id: summary.id,
      workflowName: summary.workflowName,
      status: summary.status,
      startedAt: summary.startedAt,
      agentIds: summary.agentIds,
      task: summary.task,
      procedureLabel: summary.procedureLabel,
    };
  });

  const activeRunSummary = activeRun
    ? buildActiveRunSummary(activeRun as RunRow, orgUnitNameById, products)
    : null;

  const rosterAgents = ctx.rosterNames.map((name) => {
    const agent = agents.find((a) => a.name === name);
    return {
      id: agent?.id ?? name,
      name,
      role: agent?.role ?? name,
    };
  });

  return {
    department: {
      ...ctx.departmentMeta,
      name: ctx.orgUnit?.name ?? ctx.departmentMeta.name,
    },
    activeRun: activeRunSummary
      ? {
          id: activeRunSummary.id,
          workflowName: activeRunSummary.workflowName,
          status: activeRunSummary.status,
          startedAt: activeRunSummary.startedAt,
          agentIds: activeRunSummary.agentIds,
          task: activeRunSummary.task,
          errorMessage: activeRunSummary.errorMessage,
          procedureLabel: activeRunSummary.procedureLabel,
          productId: activeRunSummary.productId,
          productName: activeRunSummary.productName,
        }
      : null,
    activeRuns,
    recentRuns: deptRecentRuns.slice(0, 5).map((r) => ({
      id: r.id,
      status: r.status,
      workflowName: r.workflow.name,
      startedAt: r.startedAt?.toISOString() ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
      totalTokens: r.totalTokens,
      totalCostUsd: r.totalCostUsd,
      errorMessage: r.errorMessage,
    })),
    team: buildTeamForRun(rosterAgents, activeRun as RunRow | null),
    procedureLabel: activeRunSummary?.procedureLabel ?? null,
  };
}

export function departmentWarRoomHref(input: {
  departmentSlug?: string | null;
  orgUnitId?: string | null;
  runId?: string | null;
}): string | null {
  const qs = input.runId ? `?watchRun=${encodeURIComponent(input.runId)}` : "";
  if (input.orgUnitId) return `/org-units/${input.orgUnitId}${qs}`;
  if (input.departmentSlug) return `/office/departments/${input.departmentSlug}${qs}`;
  return null;
}

export async function countActiveRunsForDepartment(
  tenantId: string,
  input: {
    departmentSlug?: string | null;
    orgUnitId?: string | null;
    rosterNames: string[];
    excludeRunId?: string;
  },
): Promise<number> {
  const runs = await prisma.executionRun.findMany({
    where: {
      tenantId,
      status: { in: ACTIVE_STATUSES },
      ...(input.excludeRunId ? { id: { not: input.excludeRunId } } : {}),
    },
    select: {
      id: true,
      sharedMemory: true,
      workflow: {
        select: {
          steps: {
            select: { agent: { select: { name: true } } },
            orderBy: { stepOrder: "asc" },
          },
        },
      },
    },
  });
  return runs.filter((run) =>
    runBelongsToDepartmentRoster({
      sharedMemory: run.sharedMemory,
      rosterNames: input.rosterNames,
      orgUnitId: input.orgUnitId ?? null,
      workflowAgentNames: run.workflow.steps
        .map((step) => step.agent?.name)
        .filter((name): name is string => typeof name === "string"),
    }),
  ).length;
}
