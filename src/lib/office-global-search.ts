import { prisma } from "./prisma.js";

export type OfficeSearchResultType =
  | "encargo"
  | "objective"
  | "initiative"
  | "department";

export interface OfficeSearchResult {
  type: OfficeSearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

/**
 * Búsqueda global mínima (Fase J) — encargos, objetivos, iniciativas y departamentos.
 */
export async function searchOffice(
  tenantId: string,
  query: string,
  limit = 20,
): Promise<OfficeSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const take = Math.min(10, limit);
  const [runs, goals, initiatives, orgUnits] = await Promise.all([
    prisma.executionRun.findMany({
      where: {
        tenantId,
        OR: [
          { id: { contains: q, mode: "insensitive" } },
          { companyGoal: { name: { contains: q, mode: "insensitive" } } },
          { initiative: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        sharedMemory: true,
        companyGoal: { select: { name: true } },
      },
    }),
    prisma.companyGoal.findMany({
      where: { tenantId, name: { contains: q, mode: "insensitive" } },
      take,
      select: { id: true, name: true },
    }),
    prisma.initiative.findMany({
      where: { tenantId, name: { contains: q, mode: "insensitive" } },
      take,
      select: { id: true, name: true, companyGoalId: true },
    }),
    prisma.orgUnit.findMany({
      where: { tenantId, isActive: true, name: { contains: q, mode: "insensitive" } },
      take,
      select: { id: true, name: true, slug: true },
    }),
  ]);

  const results: OfficeSearchResult[] = [];

  for (const goal of goals) {
    results.push({
      type: "objective",
      id: goal.id,
      title: goal.name,
      subtitle: "Objetivo",
      href: `/office/objetivos/${goal.id}`,
    });
  }
  for (const init of initiatives) {
    results.push({
      type: "initiative",
      id: init.id,
      title: init.name,
      subtitle: "Iniciativa",
      href: `/office/trabajo?tab=todos&companyGoalId=${init.companyGoalId}&initiativeId=${init.id}`,
    });
  }
  for (const unit of orgUnits) {
    results.push({
      type: "department",
      id: unit.id,
      title: unit.name,
      subtitle: "Departamento",
      href: `/office/departments/${unit.slug}`,
    });
  }
  for (const run of runs) {
    const memory = run.sharedMemory as Record<string, unknown>;
    const task =
      (typeof memory.task === "string" && memory.task) ||
      (typeof memory.officeRequest === "string" && memory.officeRequest) ||
      run.id;
    results.push({
      type: "encargo",
      id: run.id,
      title: String(task).slice(0, 120),
      subtitle: run.companyGoal?.name ?? "Encargo",
      href: `/office/encargos/${run.id}`,
    });
  }

  return results.slice(0, limit);
}
