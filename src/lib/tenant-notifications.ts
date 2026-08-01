import type { ExecutionStatus } from "@prisma/client";
import { encargoHumanHref } from "./office-encargos.js";
import {
  countActiveRunsForDepartment,
  departmentWarRoomHref,
} from "./office-department-team.js";
import { encargoActivityFields } from "./office-encargos.js";
import { extractRunTeamAgentNames } from "./office-run-department.js";
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

const LOCALE_SPLIT = "\n---\n";

function bilingual(es: string, en: string): string {
  return `${es}${LOCALE_SPLIT}${en}`;
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
  procedureLabel?: string;
  departmentLabel?: string | null;
  totalCostUsd: number;
  totalTokens: number;
  errorMessage?: string | null;
}): { title: string; body: string } {
  const deptSuffix = params.departmentLabel ? ` · ${params.departmentLabel}` : "";
  const procedurePrefix = params.procedureLabel ? `${params.procedureLabel}: ` : "";

  if (params.status === "COMPLETED") {
    return {
      title: bilingual(
        `${params.workflowName} completado${deptSuffix}`,
        `${params.workflowName} completed${deptSuffix}`,
      ),
      body: bilingual(
        `${procedurePrefix}La tarea terminó correctamente. Coste: $${params.totalCostUsd.toFixed(2)} · ${params.totalTokens.toLocaleString()} tokens.`,
        `${procedurePrefix}Task finished successfully. Cost: $${params.totalCostUsd.toFixed(2)} · ${params.totalTokens.toLocaleString()} tokens.`,
      ),
    };
  }

  const error =
    params.errorMessage?.slice(0, 280) ??
    "Revisa los logs del run para más detalle.";

  return {
    title: bilingual(
      `${params.workflowName} falló${deptSuffix}`,
      `${params.workflowName} failed${deptSuffix}`,
    ),
    body: bilingual(
      `${procedurePrefix}${error}`,
      `${procedurePrefix}${params.errorMessage?.slice(0, 280) ?? "Check run logs for details."}`,
    ),
  };
}

export function buildDepartmentReadyCopy(params: {
  departmentLabel: string;
  procedureLabel: string;
  failed?: boolean;
}): { title: string; body: string } {
  if (params.failed) {
    return {
      title: bilingual(
        `Departamento en pausa · ${params.departmentLabel}`,
        `Department idle · ${params.departmentLabel}`,
      ),
      body: bilingual(
        `${params.procedureLabel} falló y no quedan encargos activos en este departamento.`,
        `${params.procedureLabel} failed and there are no active jobs left in this department.`,
      ),
    };
  }
  return {
    title: bilingual(
      `Departamento listo · ${params.departmentLabel}`,
      `Department ready · ${params.departmentLabel}`,
    ),
    body: bilingual(
      `${params.procedureLabel} terminó. No quedan encargos activos en este departamento.`,
      `${params.procedureLabel} finished. No active jobs remain in this department.`,
    ),
  };
}

async function resolveDepartmentRosterNames(
  tenantId: string,
  deptContext: ReturnType<typeof resolveEncargoDepartmentContext>,
  teamAgents: string[],
): Promise<string[]> {
  let rosterNames = teamAgents;
  if (rosterNames.length === 0 && deptContext.departmentSlug) {
    rosterNames =
      VIRTUAL_OFFICE_DEPARTMENTS.find((d) => d.slug === deptContext.departmentSlug)?.agentNames ??
      [];
  }
  if (rosterNames.length === 0 && deptContext.orgUnitId) {
    const org = await prisma.orgUnit.findFirst({
      where: { id: deptContext.orgUnitId, tenantId },
      include: { template: { select: { definition: true } } },
    });
    if (org) {
      const { suggestedAgentsFromOrgRecord } = await import("./org-context.js");
      rosterNames = suggestedAgentsFromOrgRecord(org);
    }
  }
  return rosterNames;
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
    select: {
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
  const memory = (run?.sharedMemory ?? {}) as SharedMemory;
  const workflowAgentNames =
    run?.workflow.steps
      .map((step) => step.agent?.name)
      .filter((name): name is string => typeof name === "string") ?? [];
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
  const teamAgents = extractRunTeamAgentNames(memory, workflowAgentNames);
  const deptContext = resolveEncargoDepartmentContext({
    teamAgents,
    orgUnitId: typeof memory.orgUnitId === "string" ? memory.orgUnitId : null,
    orgUnitName: fields.orgUnitName,
    workflowName: params.workflowName,
  });

  const deptLabel = deptContext.orgUnitName ?? fields.departmentSlug ?? null;
  const warHref =
    departmentWarRoomHref({
      departmentSlug: deptContext.departmentSlug,
      orgUnitId: deptContext.orgUnitId,
      runId: params.runId,
    }) ?? encargoHumanHref(params.runId);

  const rosterNames = deptLabel
    ? await resolveDepartmentRosterNames(params.tenantId, deptContext, teamAgents)
    : [];

  const remaining =
    deptLabel && rosterNames.length > 0
      ? await countActiveRunsForDepartment(params.tenantId, {
          departmentSlug: deptContext.departmentSlug,
          orgUnitId: deptContext.orgUnitId,
          rosterNames,
          excludeRunId: params.runId,
        })
      : 1;

  const isLastDepartmentRun = Boolean(deptLabel && rosterNames.length > 0 && remaining === 0);

  if (isLastDepartmentRun) {
    const deptCopy = buildDepartmentReadyCopy({
      departmentLabel: deptLabel!,
      procedureLabel: fields.procedureLabel,
      failed: params.status === "FAILED",
    });
    await createTenantNotification({
      tenantId: params.tenantId,
      type: "department_run_completed",
      title: deptCopy.title,
      body: deptCopy.body,
      href: warHref,
      runId: params.runId,
    });
    return;
  }

  const copy = buildRunNotificationCopy({
    status: params.status,
    workflowName: params.workflowName,
    procedureLabel: fields.procedureLabel,
    departmentLabel: deptLabel,
    totalCostUsd: params.totalCostUsd,
    totalTokens: params.totalTokens,
    errorMessage: params.errorMessage,
  });

  await createTenantNotification({
    tenantId: params.tenantId,
    type: params.status === "COMPLETED" ? "run_completed" : "run_failed",
    title: copy.title,
    body: copy.body,
    href: warHref,
    runId: params.runId,
  });
}
