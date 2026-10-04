import { DepartmentHandoffStatus } from "@prisma/client";
import { prisma } from "./prisma.js";

export interface CollaborationEdge {
  fromOrgUnitId: string;
  fromName: string;
  fromSlug: string;
  toOrgUnitId: string;
  toName: string;
  toSlug: string;
  totalCount: number;
  pendingCount: number;
}

export interface CollaborationMap {
  edges: CollaborationEdge[];
}

/** Fase E — flujos de handoff entre departamentos (últimos 90 días). */
export async function getCollaborationMap(tenantId: string): Promise<CollaborationMap> {
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const handoffs = await prisma.departmentHandoff.findMany({
    where: {
      tenantId,
      createdAt: { gte: since },
      fromOrgUnitId: { not: null },
      toOrgUnitId: { not: null },
    },
    select: {
      fromOrgUnitId: true,
      toOrgUnitId: true,
      status: true,
      fromOrgUnit: { select: { name: true, slug: true } },
      toOrgUnit: { select: { name: true, slug: true } },
    },
  });

  const edgeMap = new Map<string, CollaborationEdge>();

  for (const row of handoffs) {
    const fromId = row.fromOrgUnitId!;
    const toId = row.toOrgUnitId!;
    const key = `${fromId}->${toId}`;
    const existing = edgeMap.get(key);
    const pending =
      row.status === DepartmentHandoffStatus.pending_acceptance ||
      row.status === DepartmentHandoffStatus.sent
        ? 1
        : 0;
    if (existing) {
      existing.totalCount += 1;
      existing.pendingCount += pending;
    } else {
      edgeMap.set(key, {
        fromOrgUnitId: fromId,
        fromName: row.fromOrgUnit?.name ?? fromId,
        fromSlug: row.fromOrgUnit?.slug ?? fromId,
        toOrgUnitId: toId,
        toName: row.toOrgUnit?.name ?? toId,
        toSlug: row.toOrgUnit?.slug ?? toId,
        totalCount: 1,
        pendingCount: pending,
      });
    }
  }

  return {
    edges: [...edgeMap.values()].sort((a, b) => b.totalCount - a.totalCount).slice(0, 24),
  };
}
