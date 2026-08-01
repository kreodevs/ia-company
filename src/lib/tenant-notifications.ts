import type { ExecutionStatus } from "@prisma/client";
import { encargoHumanHref } from "./office-encargos.js";
import {
  countActiveRunsForDepartment,
  departmentWarRoomHref,
} from "./office-department-team.js";
import { encargoActivityFields } from "./office-encargos.js";
import { resolveEncargoDepartmentContext } from "./office-procedures.js";
import { VIRTUAL_OFFICE_DEPARTMENTS } from "./office-departments.js";
import { prisma } from "./prisma.js";
import type { SharedMemory } from "../types/index.js";

export type TenantNotificationType =
  | "run_completed"
  | "run_failed"
  | "decision_pending"
  | "task_started"
  | "playbook_suggestion"
  | "department_run_completed";

export interface TenantNotificationDto {
  id: string;
  type: TenantNotificationType;
  title: string;
  body: string;
  href: string | null;
  runId: string | null;
  readAt: string | null;
  createdAt: string;
}

function toDto(row: {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  runId: string | null;
  readAt: Date | null;
  createdAt: Date;
}): TenantNotificationDto {
  return {
    id: row.id,
    type: row.type as TenantNotificationType,
    title: row.title,
    body: row.body,
    href: row.href,
    runId: row.runId,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createTenantNotification(params: {
  tenantId: string;
  type: TenantNotificationType;
  title: string;
  body: string;
  href?: string | null;
  runId?: string | null;
}): Promise<TenantNotificationDto> {
  const row = await prisma.tenantNotification.create({
    data: {
      tenantId: params.tenantId,
      type: params.type,
      title: params.title,
      body: params.body,
      href: params.href ?? null,
      runId: params.runId ?? null,
    },
  });
  return toDto(row);
}

export async function listTenantNotifications(
  tenantId: string,
  options: { unreadOnly?: boolean; limit?: number; since?: string } = {},
): Promise<{ items: TenantNotificationDto[]; unreadCount: number }> {
  const limit = Math.min(50, Math.max(1, options.limit ?? 20));
  const since = options.since ? new Date(options.since) : undefined;

  const where = {
    tenantId,
    ...(options.unreadOnly ? { readAt: null } : {}),
    ...(since ? { createdAt: { gt: since } } : {}),
  };

  const [items, unreadCount] = await Promise.all([
    prisma.tenantNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.tenantNotification.count({ where: { tenantId, readAt: null } }),
  ]);

  return { items: items.map(toDto), unreadCount };
}

export async function markNotificationRead(
  tenantId: string,
  notificationId: string,
): Promise<TenantNotificationDto | null> {
  const existing = await prisma.tenantNotification.findFirst({
    where: { id: notificationId, tenantId },
  });
  if (!existing) return null;
  const row = await prisma.tenantNotification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
  return toDto(row);
}

export async function markAllNotificationsRead(tenantId: string): Promise<number> {
  const result = await prisma.tenantNotification.updateMany({
    where: { tenantId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

export function buildRunNotificationCopy(params: {
  status: ExecutionStatus;
  workflowName: string;
  totalCostUsd: number;
  totalTokens: number;
  errorMessage?: string | null;
}): { title: string; body: string } {
  if (params.status === "COMPLETED") {
    return {
      title: `${params.workflowName} completado`,
      body: `La tarea terminó correctamente. Coste: $${params.totalCostUsd.toFixed(2)} · ${params.totalTokens.toLocaleString()} tokens.`,
    };
  }
  return {
    title: `${params.workflowName} falló`,
    body: params.errorMessage?.slice(0, 280) ?? "Revisa los logs del run para más detalle.",
  };
}

export async function notifyRunFinishedInApp(params: {
  tenantId: string;
  runId: string;
  status: ExecutionStatus;
  workflowName: string;
  totalCostUsd: number;
  totalTokens: number;
  errorMessage?: string | null;
}): Promise<void> {
  const config = await prisma.tenantNotificationConfig.findUnique({
    where: { tenantId: params.tenantId },
  });

  const notify =
    config?.notifyInApp !== false &&
    ((params.status === "COMPLETED" && config?.notifyOnComplete !== false) ||
      (params.status === "FAILED" && config?.notifyOnFail !== false));

  if (!notify) return;

  const run = await prisma.executionRun.findUnique({
    where: { id: params.runId },
    select: { sharedMemory: true },
  });
  const memory = (run?.sharedMemory ?? {}) as SharedMemory;
  const orgUnits = await prisma.orgUnit.findMany({
    where: { tenantId: params.tenantId, isActive: true },
    select: { id: true, name: true },
  });
  const orgUnitNameById = new Map(orgUnits.map((o) => [o.id, o.name]));
  const fields = encargoActivityFields({
    workflowName: params.workflowName,
    sharedMemory: memory,
    orgUnitNameById,
  });
  const deptContext = resolveEncargoDepartmentContext({
    teamAgents: Array.isArray(memory.teamAgents)
      ? memory.teamAgents.filter((n): n is string => typeof n === "string")
      : [],
    orgUnitId: typeof memory.orgUnitId === "string" ? memory.orgUnitId : null,
    orgUnitName: fields.orgUnitName,
    workflowName: params.workflowName,
  });

  const copy = buildRunNotificationCopy(params);
  const deptLabel = deptContext.orgUnitName ?? fields.departmentSlug ?? null;
  const title = deptLabel
    ? `${copy.title} · ${deptLabel}`
    : copy.title;
  const body = deptLabel
    ? `${fields.procedureLabel}: ${copy.body}`
    : copy.body;

  const warHref =
    departmentWarRoomHref({
      departmentSlug: deptContext.departmentSlug,
      orgUnitId: deptContext.orgUnitId,
    }) ?? encargoHumanHref(params.runId);

  await createTenantNotification({
    tenantId: params.tenantId,
    type: params.status === "COMPLETED" ? "run_completed" : "run_failed",
    title,
    body,
    href: encargoHumanHref(params.runId),
    runId: params.runId,
  });

  if (params.status !== "COMPLETED" || !deptLabel) return;

  let rosterNames = Array.isArray(memory.teamAgents)
    ? memory.teamAgents.filter((n): n is string => typeof n === "string")
    : [];
  if (rosterNames.length === 0 && deptContext.departmentSlug) {
    rosterNames =
      VIRTUAL_OFFICE_DEPARTMENTS.find((d) => d.slug === deptContext.departmentSlug)?.agentNames ??
      [];
  }
  if (rosterNames.length === 0 && deptContext.orgUnitId) {
    const org = await prisma.orgUnit.findFirst({
      where: { id: deptContext.orgUnitId, tenantId: params.tenantId },
      include: { template: { select: { definition: true } } },
    });
    if (org) {
      const { suggestedAgentsFromOrgRecord } = await import("./org-context.js");
      rosterNames = suggestedAgentsFromOrgRecord(org);
    }
  }
  if (rosterNames.length === 0) return;

  const remaining = await countActiveRunsForDepartment(params.tenantId, {
    departmentSlug: deptContext.departmentSlug,
    orgUnitId: deptContext.orgUnitId,
    rosterNames,
    excludeRunId: params.runId,
  });

  if (remaining > 0) return;

  await createTenantNotification({
    tenantId: params.tenantId,
    type: "department_run_completed",
    title: `Departamento listo · ${deptLabel}`,
    body: `${fields.procedureLabel} terminó. No quedan encargos activos en este departamento.`,
    href: warHref,
    runId: params.runId,
  });
}
