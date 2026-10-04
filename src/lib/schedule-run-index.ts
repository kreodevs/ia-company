import type { ExecutionStatus } from "@prisma/client";
import { prisma } from "./prisma.js";

export interface ScheduleRunRow {
  id: string;
  status: ExecutionStatus;
  completedAt: string | null;
  totalCostUsd: number;
  href: string;
}

function scheduleIdFromMemory(sharedMemory: unknown): string | null {
  const memory = (sharedMemory ?? {}) as Record<string, unknown>;
  return typeof memory.scheduleId === "string" ? memory.scheduleId : null;
}

/** Índice de runs recientes por `scheduleId` en sharedMemory (Fase I). */
export async function loadRecentRunsByScheduleId(
  tenantId: string,
  scheduleIds: string[],
  maxPerSchedule = 5,
): Promise<Map<string, ScheduleRunRow[]>> {
  const wanted = new Set(scheduleIds);
  const map = new Map<string, ScheduleRunRow[]>();
  if (!wanted.size) return map;

  const since = new Date();
  since.setDate(since.getDate() - 120);

  const runs = await prisma.executionRun.findMany({
    where: { tenantId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 400,
    select: {
      id: true,
      status: true,
      completedAt: true,
      totalCostUsd: true,
      sharedMemory: true,
      workflowId: true,
    },
  });

  for (const run of runs) {
    const scheduleId = scheduleIdFromMemory(run.sharedMemory);
    if (!scheduleId || !wanted.has(scheduleId)) continue;
    const list = map.get(scheduleId) ?? [];
    if (list.length >= maxPerSchedule) continue;
    list.push({
      id: run.id,
      status: run.status,
      completedAt: run.completedAt?.toISOString() ?? null,
      totalCostUsd: Number(run.totalCostUsd) || 0,
      href: `/office/encargos/${run.id}`,
    });
    map.set(scheduleId, list);
  }

  return map;
}
