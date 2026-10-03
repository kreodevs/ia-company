import { prisma } from '../prisma/client';

/**
 * Return the organizational hierarchy with department status.
 * Each OrgUnit includes its child OrgUnits (if any) and the count of active work items.
 */
export async function getOrganigram(tenantId: string) {
  // Load all OrgUnits for the tenant
  const units = await prisma.orgUnit.findMany({
    where: { tenantId },
    include: { children: true },
  });

  // Load work items grouped by OrgUnit
  const workItems = await prisma.departmentWorkItem.groupBy({
    by: ['orgUnitId'],
    where: { tenantId },
    _count: { id: true },
  });
  const countMap = Object.fromEntries(
    workItems.map((w) => [w.orgUnitId, w._count.id])
  );

  // Build hierarchy recursively
  const build = (unit: any): any => {
    const children = units.filter((u) => u.parentId === unit.id);
    return {
      id: unit.id,
      name: unit.name,
      workItemCount: countMap[unit.id] ?? 0,
      children: children.map(build),
    };
  };

  // Find top‑level units (no parent)
  const roots = units.filter((u) => !u.parentId);
  return roots.map(build);
}
