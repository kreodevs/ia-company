import { DepartmentHandoffStatus, DepartmentWorkStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { VIRTUAL_OFFICE_DEPARTMENTS } from "./office-departments.js";
import { createTenantNotification } from "./tenant-notifications.js";
import { encargoHumanHref } from "./office-encargos.js";

export interface DepartmentWorkMap {
  runId: string;
  items: Array<{
    id: string;
    title: string;
    objective: string | null;
    departmentSlug: string | null;
    orgUnitId: string | null;
    ownerAgentName: string | null;
    status: DepartmentWorkStatus;
    businessStatus: string | null;
    nextAction: string | null;
    blockedReason: string | null;
    dependsOnId: string | null;
    deliverablePaths: string[];
    lastActivityAt: string | null;
    handoffsFrom: Array<ReturnType<typeof serializeHandoff>>;
    handoffsTo: Array<ReturnType<typeof serializeHandoff>>;
  }>;
  handoffs: Array<ReturnType<typeof serializeHandoff>>;
}

function jsonStrings(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function serializeHandoff(handoff: {
  id: string;
  status: DepartmentHandoffStatus;
  message: string;
  fromWorkItemId: string | null;
  toWorkItemId: string | null;
  fromDepartmentSlug: string | null;
  toDepartmentSlug: string | null;
  decisions: Prisma.JsonValue;
  openQuestions: Prisma.JsonValue;
  artifactPaths: Prisma.JsonValue;
  requestedClarification: string | null;
  rejectionReason: string | null;
  acceptedBy: string | null;
  acceptedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: handoff.id,
    status: handoff.status,
    message: handoff.message,
    fromWorkItemId: handoff.fromWorkItemId,
    toWorkItemId: handoff.toWorkItemId,
    fromDepartmentSlug: handoff.fromDepartmentSlug,
    toDepartmentSlug: handoff.toDepartmentSlug,
    decisions: jsonStrings(handoff.decisions),
    openQuestions: jsonStrings(handoff.openQuestions),
    artifactPaths: jsonStrings(handoff.artifactPaths),
    requestedClarification: handoff.requestedClarification,
    rejectionReason: handoff.rejectionReason,
    acceptedBy: handoff.acceptedBy,
    acceptedAt: handoff.acceptedAt?.toISOString() ?? null,
    createdAt: handoff.createdAt.toISOString(),
  };
}

const handoffSelect = {
  id: true,
  status: true,
  message: true,
  fromWorkItemId: true,
  toWorkItemId: true,
  fromDepartmentSlug: true,
  toDepartmentSlug: true,
  decisions: true,
  openQuestions: true,
  artifactPaths: true,
  requestedClarification: true,
  rejectionReason: true,
  acceptedBy: true,
  acceptedAt: true,
  createdAt: true,
} as const;

export async function ensureDepartmentWorkItems(ownerTenantId: string, ownerRunId: string) {
  const run = await prisma.executionRun.findFirst({ where: { id: ownerRunId, tenantId: ownerTenantId }, select: { id: true, sharedMemory: true, orgUnitId: true } });
  if (!run) return null;
  const existing = await prisma.departmentWorkItem.findMany({ where: { tenantId: ownerTenantId, runId: ownerRunId }, orderBy: { createdAt: "asc" } });
  if (existing.length > 0) return existing;

  const memory = run.sharedMemory && typeof run.sharedMemory === "object" && !Array.isArray(run.sharedMemory)
    ? run.sharedMemory as Record<string, unknown> : {};
  const names = Array.isArray(memory.teamAgents) ? memory.teamAgents.filter((v): v is string => typeof v === "string") : [];
  const departments = VIRTUAL_OFFICE_DEPARTMENTS.filter((department) => names.some((name) => department.agentNames.includes(name)));
  const sourceDepartments = departments.length > 0 ? departments : [{ slug: "custom", labelKey: "", descKey: "", emoji: "", accent: "strategy" as const, agentNames: names }];

  return Promise.all(sourceDepartments.map((department, index) => prisma.departmentWorkItem.create({
    data: {
      tenantId: ownerTenantId,
      runId: ownerRunId,
      departmentSlug: department.slug,
      orgUnitId: run.orgUnitId,
      ownerAgentName: names.find((name) => department.agentNames.includes(name)) ?? names[index] ?? null,
      title: `Trabajo de ${department.slug}`,
      objective: typeof memory.task === "string" ? memory.task : null,
      status: index === 0 ? DepartmentWorkStatus.active : DepartmentWorkStatus.planned,
      businessStatus: index === 0 ? "En ejecución" : "Planificando",
      nextAction: index === 0 ? "Completar el trabajo y preparar el handoff" : "Esperar el trabajo del departamento anterior",
      dependsOnId: null,
      lastActivityAt: new Date(),
    },
  })));
}

export async function getDepartmentWorkMap(tenantId: string, runId: string): Promise<DepartmentWorkMap | null> {
  const items = await ensureDepartmentWorkItems(tenantId, runId);
  if (!items) return null;
  const rows = await prisma.departmentWorkItem.findMany({
    where: { tenantId, runId },
    orderBy: { createdAt: "asc" },
    include: { handoffsFrom: { select: handoffSelect, orderBy: { createdAt: "asc" } }, handoffsTo: { select: handoffSelect, orderBy: { createdAt: "asc" } } },
  });
  const handoffs = await prisma.departmentHandoff.findMany({ where: { tenantId, OR: [{ fromWorkItemId: { in: rows.map((row) => row.id) } }, { toWorkItemId: { in: rows.map((row) => row.id) } }] }, select: handoffSelect, orderBy: { createdAt: "asc" } });
  return {
    runId,
    items: rows.map((row) => ({
      id: row.id, title: row.title, objective: row.objective, departmentSlug: row.departmentSlug, orgUnitId: row.orgUnitId,
      ownerAgentName: row.ownerAgentName, status: row.status, businessStatus: row.businessStatus, nextAction: row.nextAction,
      blockedReason: row.blockedReason, dependsOnId: row.dependsOnId, deliverablePaths: jsonStrings(row.deliverablePaths),
      lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
      handoffsFrom: row.handoffsFrom.map(serializeHandoff), handoffsTo: row.handoffsTo.map(serializeHandoff),
    })),
    handoffs: handoffs.map(serializeHandoff),
  };
}

export async function createDepartmentHandoff(input: {
  tenantId: string; runId: string; fromWorkItemId?: string; toWorkItemId?: string; message: string;
  openQuestions?: string[]; decisions?: string[]; artifactPaths?: string[];
}) {
  const source = await prisma.departmentWorkItem.findFirst({ where: { id: input.fromWorkItemId, tenantId: input.tenantId, runId: input.runId } });
  const target = input.toWorkItemId ? await prisma.departmentWorkItem.findFirst({ where: { id: input.toWorkItemId, tenantId: input.tenantId, runId: input.runId } }) : null;
  if (!source || (input.toWorkItemId && !target)) return null;
  const handoff = await prisma.departmentHandoff.create({ data: {
    tenantId: input.tenantId, fromWorkItemId: source.id, toWorkItemId: target?.id ?? null,
    fromDepartmentSlug: source.departmentSlug, toDepartmentSlug: target?.departmentSlug ?? null,
    status: DepartmentHandoffStatus.pending_acceptance, message: input.message,
    openQuestions: input.openQuestions ?? [], decisions: input.decisions ?? [], artifactPaths: input.artifactPaths ?? [],
  }, select: handoffSelect });
  await createTenantNotification({
    tenantId: input.tenantId,
    type: "handoff_pending",
    title: `Handoff pendiente: ${source.departmentSlug ?? "?"} → ${target?.departmentSlug ?? "?"}`,
    body: input.message,
    href: encargoHumanHref(input.runId),
    runId: input.runId,
  });
  return serializeHandoff(handoff);
}

export async function updateDepartmentHandoff(input: { tenantId: string; handoffId: string; status: DepartmentHandoffStatus; actor?: string; clarification?: string; rejectionReason?: string }) {
  const handoff = await prisma.departmentHandoff.findFirst({ where: { id: input.handoffId, tenantId: input.tenantId }, include: { fromWorkItem: { select: { runId: true } }, toWorkItem: { select: { runId: true } } } });
  if (!handoff) return null;
  const handoffRunId = handoff.fromWorkItem?.runId ?? handoff.toWorkItem?.runId ?? null;
  const updated = await prisma.departmentHandoff.update({ where: { id: handoff.id }, data: {
    status: input.status, acceptedBy: input.status === DepartmentHandoffStatus.accepted ? input.actor ?? null : undefined,
    acceptedAt: input.status === DepartmentHandoffStatus.accepted ? new Date() : undefined,
    requestedClarification: input.status === DepartmentHandoffStatus.needs_clarification ? input.clarification ?? null : undefined,
    rejectionReason: input.status === DepartmentHandoffStatus.rejected ? input.rejectionReason ?? null : undefined,
  }, select: handoffSelect });
  if (input.status === DepartmentHandoffStatus.accepted && handoff.toWorkItemId) {
    await prisma.departmentWorkItem.update({ where: { id: handoff.toWorkItemId }, data: { status: DepartmentWorkStatus.active, businessStatus: "En ejecución", blockedReason: null, lastActivityAt: new Date() } });
  }
  if (input.status === DepartmentHandoffStatus.needs_clarification) {
    await createTenantNotification({
      tenantId: input.tenantId,
      type: "clarification_requested",
      title: `Clarificación solicitada: ${handoff.fromDepartmentSlug ?? "?"} → ${handoff.toDepartmentSlug ?? "?"}`,
      body: input.clarification ?? "",
      href: handoffRunId ? encargoHumanHref(handoffRunId) : "/office/trabajo",
      runId: handoffRunId,
    });
  }
  if (input.status === DepartmentHandoffStatus.rejected) {
    await createTenantNotification({
      tenantId: input.tenantId,
      type: "encargo_blocked",
      title: `Handoff rechazado: ${handoff.fromDepartmentSlug ?? "?"} → ${handoff.toDepartmentSlug ?? "?"}`,
      body: input.rejectionReason ?? "",
      href: handoffRunId ? encargoHumanHref(handoffRunId) : "/office/trabajo",
      runId: handoffRunId,
    });
  }
  return serializeHandoff(updated);
}
