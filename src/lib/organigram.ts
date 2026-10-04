import { DepartmentHandoffStatus, DepartmentWorkStatus } from "@prisma/client";
import { prisma } from "./prisma.js";

export interface OrganigramNode {
  id: string;
  name: string;
  type: string;
  slug: string;
  parentId: string | null;
  workItemCount: number;
  blockedWorkItems: number;
  pendingHandoffsIn: number;
  pendingHandoffsOut: number;
  mission: string | null;
  /** i18n key para departamentos virtuales (Fase E). */
  missionDescKey: string | null;
  procedureHighlights: string[];
  children: OrganigramNode[];
}

/**
 * Return the active organizational chart for a tenant as a tree.
 *
 * Parent references are tenant-scoped: a malformed cross-tenant parent is
 * treated as a root rather than leaking another tenant's structure.
 */
export async function getOrganigram(tenantId: string): Promise<OrganigramNode[]> {
  const [units, workItems, blockedItems, handoffsIn, handoffsOut] = await Promise.all([
    prisma.orgUnit.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true, slug: true, parentId: true, description: true },
    }),
    prisma.departmentWorkItem.groupBy({
      by: ["orgUnitId"],
      where: { tenantId, orgUnitId: { not: null } },
      _count: { id: true },
    }),
    prisma.departmentWorkItem.groupBy({
      by: ["orgUnitId"],
      where: { tenantId, orgUnitId: { not: null }, status: DepartmentWorkStatus.blocked },
      _count: { id: true },
    }),
    prisma.departmentHandoff.groupBy({
      by: ["toOrgUnitId"],
      where: {
        tenantId,
        toOrgUnitId: { not: null },
        status: DepartmentHandoffStatus.pending_acceptance,
      },
      _count: { id: true },
    }),
    prisma.departmentHandoff.groupBy({
      by: ["fromOrgUnitId"],
      where: {
        tenantId,
        fromOrgUnitId: { not: null },
        status: { in: [DepartmentHandoffStatus.sent, DepartmentHandoffStatus.pending_acceptance] },
      },
      _count: { id: true },
    }),
  ]);

  const countMap = new Map<string, number>(
    workItems.map((workItem) => [workItem.orgUnitId as string, workItem._count.id]),
  );
  const blockedMap = new Map(
    blockedItems.map((row) => [row.orgUnitId as string, row._count.id]),
  );
  const handoffsInMap = new Map(
    handoffsIn.map((row) => [row.toOrgUnitId as string, row._count.id]),
  );
  const handoffsOutMap = new Map(
    handoffsOut.map((row) => [row.fromOrgUnitId as string, row._count.id]),
  );
  const nodeMap = new Map<string, OrganigramNode>();

  for (const unit of units) {
    nodeMap.set(unit.id, {
      id: unit.id,
      name: unit.name,
      type: unit.type,
      slug: unit.slug,
      parentId: unit.parentId,
      workItemCount: countMap.get(unit.id) ?? 0,
      blockedWorkItems: blockedMap.get(unit.id) ?? 0,
      pendingHandoffsIn: handoffsInMap.get(unit.id) ?? 0,
      pendingHandoffsOut: handoffsOutMap.get(unit.id) ?? 0,
      mission: unit.description?.trim() || null,
      missionDescKey: null,
      procedureHighlights: [],
      children: [],
    });
  }

  await attachProcedureHighlights(tenantId, nodeMap);

  const roots: OrganigramNode[] = [];
  for (const node of nodeMap.values()) {
    const parent = node.parentId ? nodeMap.get(node.parentId) : undefined;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}

async function attachProcedureHighlights(
  tenantId: string,
  nodeMap: Map<string, OrganigramNode>,
): Promise<void> {
  const { listGroupedProcedures } = await import("./office-procedures.js");
  const { VIRTUAL_OFFICE_DEPARTMENTS } = await import("./office-departments.js");
  const grouped = await listGroupedProcedures(tenantId);

  for (const group of grouped.groups) {
    if (group.orgUnitId) {
      const node = nodeMap.get(group.orgUnitId);
      if (node) {
        node.procedureHighlights = group.items.slice(0, 3).map((p) => p.procedureLabel);
      }
      continue;
    }
    if (group.departmentSlug) {
      const unit = [...nodeMap.values()].find((n) => n.slug === group.departmentSlug);
      if (unit) {
        unit.procedureHighlights = group.items.slice(0, 3).map((p) => p.procedureLabel);
      }
    }
  }

  for (const def of VIRTUAL_OFFICE_DEPARTMENTS) {
    const node = [...nodeMap.values()].find((n) => n.slug === def.slug);
    if (node && !node.mission) {
      node.missionDescKey = def.descKey;
    }
  }
}

/** Nodo raíz CEO/coordinador (Fase E) envolviendo el árbol real. */
export function wrapOrganigramWithExecutive(roots: OrganigramNode[]): OrganigramNode[] {
  if (!roots.length) return roots;
  const sum = (pick: (n: OrganigramNode) => number) =>
    roots.reduce((acc, node) => acc + pick(node) + sumChildren(node, pick), 0);

  function sumChildren(node: OrganigramNode, pick: (n: OrganigramNode) => number): number {
    return node.children.reduce((acc, child) => acc + pick(child) + sumChildren(child, pick), 0);
  }

  return [
    {
      id: "__executive__",
      name: "Dirección (CEO)",
      type: "executive",
      slug: "__executive__",
      parentId: null,
      workItemCount: sum((n) => n.workItemCount),
      blockedWorkItems: sum((n) => n.blockedWorkItems),
      pendingHandoffsIn: sum((n) => n.pendingHandoffsIn),
      pendingHandoffsOut: sum((n) => n.pendingHandoffsOut),
      mission: "Coordinación estratégica, priorización de encargos y visión de empresa.",
      missionDescKey: null,
      procedureHighlights: [],
      children: roots,
    },
  ];
}
