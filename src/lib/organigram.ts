import { prisma } from "./prisma.js";

/**
 * Return the organizational chart for a tenant.
 *
 * The current schema models departments as flat `OrgUnit` records (there is no
 * self-referencing `parentId`), so this returns each active unit together with
 * the number of work items assigned to it.
 */
export async function getOrganigram(tenantId: string) {
  const units = await prisma.orgUnit.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true, slug: true },
  });

  const workItems = await prisma.departmentWorkItem.groupBy({
    by: ["orgUnitId"],
    where: { tenantId },
    _count: { id: true },
  });

  const countMap = new Map<string, number>(
    workItems.map((w) => [w.orgUnitId, w._count.id] as [string, number]),
  );

  return units.map((unit) => ({
    id: unit.id,
    name: unit.name,
    type: unit.type,
    slug: unit.slug,
    workItemCount: countMap.get(unit.id) ?? 0,
    children: [] as { id: string; name: string; workItemCount: number }[],
  }));
}
