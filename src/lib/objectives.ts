import type { CompanyGoal, ExecutionStatus, Initiative } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function getObjectives(tenantId: string) {
  return prisma.companyGoal.findMany({ where: { tenantId }, orderBy: { updatedAt: "desc" } });
}

export interface ObjectiveSummaryRow {
  id: string;
  name: string;
  targetValue: number | null;
  currentValue: number | null;
  encargoCount: number;
  totalCostUsd: number;
}

/** Resumen ligero para dashboard estratégico (Fase F/H). */
export async function getObjectivesSummary(tenantId: string): Promise<ObjectiveSummaryRow[]> {
  const goals = await prisma.companyGoal.findMany({
    where: { tenantId },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });
  if (!goals.length) return [];

  const stats = await prisma.executionRun.groupBy({
    by: ["companyGoalId"],
    where: { tenantId, companyGoalId: { in: goals.map((g) => g.id) } },
    _count: { id: true },
    _sum: { totalCostUsd: true },
  });
  const statMap = new Map(
    stats
      .filter((s) => s.companyGoalId)
      .map((s) => [
        s.companyGoalId as string,
        { count: s._count.id, cost: s._sum.totalCostUsd ?? 0 },
      ]),
  );

  return goals.map((goal) => {
    const row = statMap.get(goal.id);
    return {
      id: goal.id,
      name: goal.name,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      encargoCount: row?.count ?? 0,
      totalCostUsd: Math.round((row?.cost ?? 0) * 100) / 100,
    };
  });
}

export async function getInitiatives(tenantId: string) {
  return prisma.initiative.findMany({ where: { tenantId }, orderBy: { updatedAt: "desc" } });
}

export async function getCostMetrics(tenantId: string) {
  const totalCostUsd = await prisma.executionRun
    .aggregate({
      where: { tenantId },
      _sum: { totalCostUsd: true },
    })
    .then((r) => Number(r._sum.totalCostUsd) || 0);
  const activeRuns = await prisma.executionRun.count({ where: { tenantId, status: "RUNNING" } });
  return { totalCostUsd, activeRuns };
}

/** Progreso reportado a partir de encargos entregados vs total vinculado. */
export function computeGoalProgressPercent(
  deliveredCount: number,
  totalEncargos: number,
  targetValue: number | null,
): number {
  if (totalEncargos <= 0) return 0;
  const completionRatio = deliveredCount / totalEncargos;
  const cap = targetValue != null && targetValue > 0 ? targetValue : 100;
  return Math.min(100, Math.round(completionRatio * cap));
}

const ACTIVE_STATUSES: ExecutionStatus[] = [
  "PENDING",
  "RUNNING",
  "DELEGATED",
  "AWAITING_USER",
];

/** Recalcula y persiste `currentValue` tras completar encargos (Fase F). */
export async function syncCompanyGoalProgress(
  tenantId: string,
  goalId: string,
): Promise<number | null> {
  const goal = await prisma.companyGoal.findFirst({ where: { id: goalId, tenantId } });
  if (!goal) return null;

  const [encargoCount, deliveredEncargos] = await Promise.all([
    prisma.executionRun.count({ where: { tenantId, companyGoalId: goalId } }),
    prisma.executionRun.count({
      where: { tenantId, companyGoalId: goalId, status: "COMPLETED" },
    }),
  ]);

  const progressPercent = computeGoalProgressPercent(
    deliveredEncargos,
    encargoCount,
    goal.targetValue,
  );

  if (goal.currentValue !== progressPercent) {
    await prisma.companyGoal.update({
      where: { id: goalId },
      data: { currentValue: progressPercent },
    });
  }
  return progressPercent;
}

export async function syncCompanyGoalProgressForRun(
  tenantId: string,
  run: { companyGoalId: string | null },
): Promise<void> {
  if (!run.companyGoalId) return;
  await syncCompanyGoalProgress(tenantId, run.companyGoalId);
}

export interface ObjectiveEncargoSummary {
  id: string;
  title: string;
  status: ExecutionStatus;
  phase: "queued" | "in_progress" | "delivered" | "failed" | "cancelled";
  totalCostUsd: number;
  initiativeId: string | null;
  initiativeName: string | null;
  createdAt: string;
}

export interface InitiativeRollup {
  id: string;
  name: string;
  status: string | null;
  encargoCount: number;
  deliveredCount: number;
  totalCostUsd: number;
}

export interface CompanyGoalDetail {
  goal: CompanyGoal;
  initiatives: Initiative[];
  stats: {
    encargoCount: number;
    activeEncargos: number;
    deliveredEncargos: number;
    totalCostUsd: number;
    progressPercent: number;
  };
  initiativeRollups: InitiativeRollup[];
  recentEncargos: ObjectiveEncargoSummary[];
}

function runPhase(status: ExecutionStatus): ObjectiveEncargoSummary["phase"] {
  if (status === "COMPLETED") return "delivered";
  if (status === "FAILED") return "failed";
  if (status === "CANCELLED") return "cancelled";
  if (status === "PENDING") return "queued";
  return "in_progress";
}

function runTitle(run: {
  sharedMemory: unknown;
  workflow: { name: string } | null;
}): string {
  const mem = run.sharedMemory as Record<string, unknown>;
  const task =
    (typeof mem?.task === "string" && mem.task.trim()) ||
    (typeof mem?.officeRequest === "string" && mem.officeRequest.trim()) ||
    "";
  const trimmed = task.trim();
  if (trimmed) return trimmed.length > 100 ? `${trimmed.slice(0, 97)}…` : trimmed;
  return run.workflow?.name ?? "Encargo";
}

export async function getObjectiveDetail(
  tenantId: string,
  goalId: string,
): Promise<CompanyGoalDetail | null> {
  const goal = await prisma.companyGoal.findFirst({ where: { id: goalId, tenantId } });
  if (!goal) return null;

  const [initiatives, runs, aggregates] = await Promise.all([
    prisma.initiative.findMany({
      where: { tenantId, companyGoalId: goalId },
      orderBy: { name: "asc" },
    }),
    prisma.executionRun.findMany({
      where: { tenantId, companyGoalId: goalId },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        status: true,
        totalCostUsd: true,
        createdAt: true,
        sharedMemory: true,
        initiativeId: true,
        initiative: { select: { id: true, name: true } },
        workflow: { select: { name: true } },
      },
    }),
    prisma.executionRun.groupBy({
      by: ["initiativeId"],
      where: { tenantId, companyGoalId: goalId },
      _count: { id: true },
      _sum: { totalCostUsd: true },
    }),
  ]);

  const encargoCount = await prisma.executionRun.count({
    where: { tenantId, companyGoalId: goalId },
  });
  const deliveredEncargos = await prisma.executionRun.count({
    where: { tenantId, companyGoalId: goalId, status: "COMPLETED" },
  });
  const activeEncargos = await prisma.executionRun.count({
    where: { tenantId, companyGoalId: goalId, status: { in: ACTIVE_STATUSES } },
  });
  const costAgg = await prisma.executionRun.aggregate({
    where: { tenantId, companyGoalId: goalId },
    _sum: { totalCostUsd: true },
  });
  const totalCostUsd = Math.round((costAgg._sum.totalCostUsd ?? 0) * 100) / 100;

  const progressPercent =
    (await syncCompanyGoalProgress(tenantId, goalId)) ??
    computeGoalProgressPercent(deliveredEncargos, encargoCount, goal.targetValue);
  goal.currentValue = progressPercent;

  const deliveredByInitiative = await prisma.executionRun.groupBy({
    by: ["initiativeId"],
    where: { tenantId, companyGoalId: goalId, status: "COMPLETED" },
    _count: { id: true },
  });
  const deliveredMap = new Map(
    deliveredByInitiative.map((row) => [row.initiativeId ?? "__none__", row._count.id]),
  );

  const initiativeRollups: InitiativeRollup[] = initiatives.map((init) => {
    const agg = aggregates.find((a) => a.initiativeId === init.id);
    return {
      id: init.id,
      name: init.name,
      status: init.status,
      encargoCount: agg?._count.id ?? 0,
      deliveredCount: deliveredMap.get(init.id) ?? 0,
      totalCostUsd: Math.round((agg?._sum.totalCostUsd ?? 0) * 100) / 100,
    };
  });

  const unlinked = aggregates.find((a) => a.initiativeId === null);
  if (unlinked && unlinked._count.id > 0) {
    initiativeRollups.push({
      id: "__unlinked__",
      name: "Sin iniciativa",
      status: null,
      encargoCount: unlinked._count.id,
      deliveredCount: deliveredMap.get("__none__") ?? 0,
      totalCostUsd: Math.round((unlinked._sum.totalCostUsd ?? 0) * 100) / 100,
    });
  }

  const recentEncargos: ObjectiveEncargoSummary[] = runs.map((run) => ({
    id: run.id,
    title: runTitle(run),
    status: run.status,
    phase: runPhase(run.status),
    totalCostUsd: run.totalCostUsd,
    initiativeId: run.initiativeId,
    initiativeName: run.initiative?.name ?? null,
    createdAt: run.createdAt.toISOString(),
  }));

  return {
    goal,
    initiatives,
    stats: {
      encargoCount,
      activeEncargos,
      deliveredEncargos,
      totalCostUsd,
      progressPercent,
    },
    initiativeRollups,
    recentEncargos,
  };
}

// ---------- CRUD for CompanyGoal ----------
export async function createObjective(
  tenantId: string,
  data: { name: string; description?: string; targetValue?: number },
) {
  return prisma.companyGoal.create({
    data: { tenantId, name: data.name, description: data.description, targetValue: data.targetValue },
  });
}

export async function updateObjective(
  tenantId: string,
  id: string,
  data: { name?: string; description?: string; targetValue?: number; currentValue?: number },
) {
  return prisma.companyGoal.update({ where: { id, tenantId }, data });
}

export async function deleteObjective(tenantId: string, id: string) {
  return prisma.companyGoal.delete({ where: { id, tenantId } });
}

// ---------- CRUD for Initiative ----------
export async function createInitiative(
  tenantId: string,
  data: { name: string; description?: string; status?: string; companyGoalId: string },
) {
  return prisma.initiative.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description,
      status: data.status,
      companyGoalId: data.companyGoalId,
    },
  });
}

export async function updateInitiative(
  tenantId: string,
  id: string,
  data: { name?: string; description?: string; status?: string; companyGoalId?: string },
) {
  return prisma.initiative.update({ where: { id, tenantId }, data });
}

export async function deleteInitiative(tenantId: string, id: string) {
  return prisma.initiative.delete({ where: { id, tenantId } });
}
