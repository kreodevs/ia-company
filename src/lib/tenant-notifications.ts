import type { ExecutionStatus } from "@prisma/client";
import { encargoHumanHref } from "./office-encargos.js";
import { prisma } from "./prisma.js";

export type TenantNotificationType =
  | "run_completed"
  | "run_failed"
  | "decision_pending"
  | "task_started";

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

  const copy = buildRunNotificationCopy(params);
  await createTenantNotification({
    tenantId: params.tenantId,
    type: params.status === "COMPLETED" ? "run_completed" : "run_failed",
    title: copy.title,
    body: copy.body,
    href: encargoHumanHref(params.runId),
    runId: params.runId,
  });
}
