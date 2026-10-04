/**
 * Reingeniería 2, Fase D — Inbox empresarial.
 * Read-model agregador: reúne excepciones y acciones humanas de fuentes
 * existentes (checkpoints, decisiones, handoffs, trabajos bloqueados,
 * notificaciones y presupuesto) sin almacenamiento adicional.
 */
import { DepartmentHandoffStatus, DepartmentWorkStatus, RunCheckpointStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { encargoHumanHref } from "./office-encargos.js";

export type OfficeInboxCategory =
  | "decision"
  | "handoff"
  | "blocked"
  | "review"
  | "cost"
  | "failure"
  | "info";

export interface OfficeInboxItem {
  id: string;
  kind: string;
  category: OfficeInboxCategory;
  /** 1 = más urgente */
  priority: number;
  title: string;
  body: string | null;
  href: string;
  runId: string | null;
  refId: string;
  /** Endpoint y payload para resolver sin ir a debug. */
  resolve: { method: "POST" | "PATCH"; url: string; body?: Record<string, unknown> } | null;
  createdAt: string;
}

const CATEGORY_PRIORITY: Record<OfficeInboxCategory, number> = {
  decision: 1,
  handoff: 2,
  blocked: 3,
  failure: 4,
  review: 5,
  cost: 6,
  info: 7,
};

/** Prioridad 1 = más urgente. Expuesta para tests y para el badge de la UI. */
export function officeInboxCategoryPriority(category: OfficeInboxCategory): number {
  return CATEGORY_PRIORITY[category];
}

/** Orden estable: prioridad ascendente, luego fecha descendente. No muta la entrada. */
export function sortOfficeInboxItems(items: OfficeInboxItem[]): OfficeInboxItem[] {
  return [...items].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

function item(params: {
  id: string;
  kind: string;
  category: OfficeInboxCategory;
  title: string;
  body?: string | null;
  href: string;
  runId?: string | null;
  refId: string;
  resolve?: OfficeInboxItem["resolve"];
  createdAt: Date;
}): OfficeInboxItem {
  return {
    id: params.id,
    kind: params.kind,
    category: params.category,
    priority: CATEGORY_PRIORITY[params.category],
    title: params.title,
    body: params.body ?? null,
    href: params.href,
    runId: params.runId ?? null,
    refId: params.refId,
    resolve: params.resolve ?? null,
    createdAt: params.createdAt.toISOString(),
  };
}

export async function getOfficeInbox(
  tenantId: string,
  options: { category?: OfficeInboxCategory; limit?: number } = {},
): Promise<OfficeInboxItem[]> {
  const limit = Math.min(100, Math.max(10, options.limit ?? 50));

  const failureSince = new Date();
  failureSince.setDate(failureSince.getDate() - 14);

  const [checkpoints, proposals, handoffs, blockedItems, reviewItems, notifications, failedRuns] =
    await Promise.all([
      prisma.runCheckpoint.findMany({
        where: { tenantId, status: RunCheckpointStatus.pending },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { run: { select: { id: true, workflow: { select: { name: true } } } } },
      }),
      prisma.decisionProposal.findMany({
        where: { tenantId, status: { in: ["pending_review", "drilling"] } },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.departmentHandoff.findMany({
        where: {
          tenantId,
          status: { in: [DepartmentHandoffStatus.pending_acceptance, DepartmentHandoffStatus.needs_clarification] },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { toWorkItem: { select: { runId: true, title: true } } },
      }),
      prisma.departmentWorkItem.findMany({
        where: {
          tenantId,
          status: { in: [DepartmentWorkStatus.blocked, DepartmentWorkStatus.waiting_review] },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      }),
      prisma.documentReview.findMany({
        where: { tenantId, status: { in: ["pending_review", "changes_requested"] } },
        orderBy: { updatedAt: "desc" },
        take: limit,
      }),
      prisma.tenantNotification.findMany({
        where: { tenantId, readAt: null, type: { in: ["run_failed", "cost_alert", "budget_exceeded"] } },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.executionRun.findMany({
        where: { tenantId, status: "FAILED", createdAt: { gte: failureSince } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          createdAt: true,
          errorMessage: true,
          sharedMemory: true,
          workflow: { select: { name: true } },
        },
      }),
    ]);

  const items: OfficeInboxItem[] = [];

  for (const checkpoint of checkpoints) {
    const kind = checkpoint.kind;
    const category: OfficeInboxCategory =
      kind === "need_input" || kind === "custom" ? "review" : kind === "budget_exceeded" ? "cost" : "decision";
    items.push(
      item({
        id: `chk-${checkpoint.id}`,
        kind: `checkpoint_${kind}`,
        category,
        title: checkpoint.title ?? "Checkpoint requiere atención",
        body: null,
        href: encargoHumanHref(checkpoint.runId),
        runId: checkpoint.runId,
        refId: checkpoint.id,
        resolve: checkpoint.sessionId
          ? {
              method: "POST",
              url: `/office/sessions/${checkpoint.sessionId}/checkpoints/${checkpoint.id}/resolve`,
            }
          : null,
        createdAt: checkpoint.createdAt,
      }),
    );
  }

  for (const proposal of proposals) {
    items.push(
      item({
        id: `dec-${proposal.id}`,
        kind: "decision_pending",
        category: "decision",
        title: `Decisión pendiente: ${proposal.rationale.slice(0, 80)}`,
        body: null,
        href: "/office/inbox?category=decision",
        runId: proposal.runId,
        refId: proposal.id,
        resolve: {
          method: "POST",
          url: `/decisions/${proposal.id}/approve`,
        },
        createdAt: proposal.createdAt,
      }),
    );
  }

  for (const handoff of handoffs) {
    items.push(
      item({
        id: `hnd-${handoff.id}`,
        kind: `handoff_${handoff.status}`,
        category: "handoff",
        title: `Handoff ${handoff.fromDepartmentSlug ?? "?"} → ${handoff.toDepartmentSlug ?? "?"}`,
        body: handoff.message,
        href: handoff.toWorkItem?.runId ? encargoHumanHref(handoff.toWorkItem.runId) : "/office/trabajo",
        runId: handoff.toWorkItem?.runId ?? null,
        refId: handoff.id,
        resolve: {
          method: "PATCH",
          url: `/office/handoffs/${handoff.id}`,
          body: { status: "accepted" },
        },
        createdAt: handoff.createdAt,
      }),
    );
  }

  for (const workItem of blockedItems) {
    items.push(
      item({
        id: `wrk-${workItem.id}`,
        kind: `work_${workItem.status}`,
        category: workItem.status === DepartmentWorkStatus.blocked ? "blocked" : "review",
        title: workItem.title,
        body: workItem.blockedReason ?? workItem.nextAction,
        href: encargoHumanHref(workItem.runId),
        runId: workItem.runId,
        refId: workItem.id,
        resolve: null,
        createdAt: workItem.updatedAt,
      }),
    );
  }

  for (const review of reviewItems) {
    items.push(
      item({
        id: `rev-${review.id}`,
        kind: `doc_review_${review.status}`,
        category: "review",
        title: `Revisión de documento ${review.docKey}`,
        body: null,
        href: encargoHumanHref(review.runId),
        runId: review.runId,
        refId: review.id,
        resolve: null,
        createdAt: review.updatedAt,
      }),
    );
  }

  const notifiedRunIds = new Set(
    notifications.map((n) => n.runId).filter((id): id is string => Boolean(id)),
  );

  for (const run of failedRuns) {
    const memory = run.sharedMemory as Record<string, unknown>;
    const scheduleId = typeof memory.scheduleId === "string" ? memory.scheduleId : null;
    if (!scheduleId) continue;
    if (notifiedRunIds.has(run.id)) continue;
    const scheduleName =
      typeof memory.scheduleName === "string" ? memory.scheduleName : "Operación programada";
    items.push(
      item({
        id: `sch-fail-${run.id}`,
        kind: "schedule_run_failed",
        category: "failure",
        title: `Rutina fallida: ${scheduleName}`,
        body: run.errorMessage ?? run.workflow?.name ?? null,
        href: encargoHumanHref(run.id),
        runId: run.id,
        refId: scheduleId,
        resolve: {
          method: "PATCH",
          url: `/office/operations/${scheduleId}`,
          body: { enabled: false },
        },
        createdAt: run.createdAt,
      }),
    );
  }

  for (const notification of notifications) {
    items.push(
      item({
        id: `ntf-${notification.id}`,
        kind: `notification_${notification.type}`,
        category: notification.type === "run_failed" ? "failure" : "cost",
        title: notification.title,
        body: notification.body,
        href: notification.href ?? "/office/trabajo",
        runId: notification.runId,
        refId: notification.id,
        resolve: {
          method: "POST",
          url: `/office/notifications/${notification.id}/read`,
        },
        createdAt: notification.createdAt,
      }),
    );
  }

  items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const filtered =
    options.category ? items.filter((entry) => entry.category === options.category) : items;

  return filtered.slice(0, limit);
}
