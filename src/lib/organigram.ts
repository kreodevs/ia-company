import { prisma } from "./prisma.js";

export interface OrganigramNode {
  id: string;
  name: string;
  type: string;
  slug: string;
  parentId: string | null;
  workItemCount: number;
  children: OrganigramNode[];
}

/**
 * Return the active organizational chart for a tenant as a tree.
 *
 * Parent references are tenant-scoped: a malformed cross-tenant parent is
 * treated as a root rather than leaking another tenant's structure.
 */
export async function getOrganigram(tenantId: string): Promise<OrganigramNode[]> {
  const [units, workItems] = await Promise.all([
    prisma.orgUnit.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true, slug: true, parentId: true },
    }),
    prisma.departmentWorkItem.groupBy({
      by: ["orgUnitId"],
      where: { tenantId, orgUnitId: { not: null } },
      _count: { id: true },
    }),
  ]);

  const countMap = new Map<string, number>(
    workItems.map((workItem) => [workItem.orgUnitId as string, workItem._count.id]),
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
      children: [],
    });
  }

  const roots: OrganigramNode[] = [];
  for (const node of nodeMap.values()) {
    const parent = node.parentId ? nodeMap.get(node.parentId) : undefined;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}
