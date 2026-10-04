import type { ExecutionStatus } from "@prisma/client";
import {
  listProceduresForOrgUnit,
  listProceduresForVirtualDepartment,
  type OfficeScheduledProcedureSummary,
} from "./office-procedures.js";
import { prisma } from "./prisma.js";

export type DepartmentOperationHealth = "healthy" | "warning" | "paused" | "disabled";

export interface DepartmentOperationRunRow {
  id: string;
  status: ExecutionStatus;
  completedAt: string | null;
  totalCostUsd: number;
  href: string;
}

export interface DepartmentOperationRow extends OfficeScheduledProcedureSummary {
  health: DepartmentOperationHealth;
  pauseReason: string | null;
  avgCostUsd: number | null;
  lastRunStatus: ExecutionStatus | null;
  lastRunId: string | null;
  recentRuns: DepartmentOperationRunRow[];
}

function deriveHealth(
  schedule: OfficeScheduledProcedureSummary & { lastSkipReason?: string | null },
): { health: DepartmentOperationHealth; pauseReason: string | null } {
  if (!schedule.enabled) {
    return { health: "disabled", pauseReason: "Operación desactivada" };
  }
  const skip = schedule.currentSkipReason ?? schedule.lastSkipReason ?? null;
  if (skip) {
    return { health: "warning", pauseReason: skip };
  }
  if (!schedule.conditionsMet) {
    return { health: "paused", pauseReason: "Condiciones no cumplidas" };
  }
  return { health: "healthy", pauseReason: null };
}

async function enrichScheduled(
  tenantId: string,
  scheduled: OfficeScheduledProcedureSummary[],
): Promise<DepartmentOperationRow[]> {
  const workflowIds = scheduled.map((s) => s.workflowId).filter(Boolean) as string[];
  const runsByWorkflow = new Map<string, DepartmentOperationRunRow[]>();

  if (workflowIds.length) {
    const runs = await prisma.executionRun.findMany({
      where: { tenantId, workflowId: { in: workflowIds } },
      orderBy: { createdAt: "desc" },
      take: Math.min(80, workflowIds.length * 8),
      select: {
        id: true,
        workflowId: true,
        status: true,
        completedAt: true,
        totalCostUsd: true,
      },
    });
    for (const run of runs) {
      if (!run.workflowId) continue;
      const list = runsByWorkflow.get(run.workflowId) ?? [];
      if (list.length < 5) {
        list.push({
          id: run.id,
          status: run.status,
          completedAt: run.completedAt?.toISOString() ?? null,
          totalCostUsd: Number(run.totalCostUsd) || 0,
          href: `/office/encargos/${run.id}`,
        });
        runsByWorkflow.set(run.workflowId, list);
      }
    }
  }

  const scheduleRows = await prisma.autonomousSchedule.findMany({
    where: { tenantId, id: { in: scheduled.map((s) => s.scheduleId) } },
    select: { id: true, lastSkipReason: true },
  });
  const skipById = new Map(scheduleRows.map((r) => [r.id, r.lastSkipReason]));

  return scheduled.map((item) => {
    const recentRuns = item.workflowId ? runsByWorkflow.get(item.workflowId) ?? [] : [];
    const costs = recentRuns.map((r) => r.totalCostUsd).filter((c) => c > 0);
    const avgCostUsd =
      costs.length > 0
        ? Math.round((costs.reduce((a, b) => a + b, 0) / costs.length) * 100) / 100
        : null;
    const last = recentRuns[0] ?? null;
    const { health, pauseReason } = deriveHealth({
      ...item,
      lastSkipReason: skipById.get(item.scheduleId) ?? null,
    });
    return {
      ...item,
      health,
      pauseReason,
      avgCostUsd,
      lastRunStatus: last?.status ?? null,
      lastRunId: last?.id ?? null,
      recentRuns,
    };
  });
}

export async function listDepartmentOperations(
  tenantId: string,
  ctx: { departmentSlug: string } | { orgUnitId: string },
): Promise<DepartmentOperationRow[]> {
  const response =
    "departmentSlug" in ctx
      ? await listProceduresForVirtualDepartment(tenantId, ctx.departmentSlug)
      : await listProceduresForOrgUnit(tenantId, ctx.orgUnitId);
  return enrichScheduled(tenantId, response.scheduled);
}
