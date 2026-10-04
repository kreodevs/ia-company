import { prisma } from "./prisma.js";

export type OfficeSearchResultType =
  | "encargo"
  | "objective"
  | "initiative"
  | "department"
  | "decision"
  | "handoff"
  | "agent"
  | "document"
  | "comment";

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
  const [runs, goals, initiatives, orgUnits, decisions, handoffs, agents, docs, comments] =
    await Promise.all([
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
    prisma.decisionProposal.findMany({
      where: {
        tenantId,
        OR: [
          { workflowName: { contains: q, mode: "insensitive" } },
          { rationale: { contains: q, mode: "insensitive" } },
        ],
      },
      take,
      select: { id: true, workflowName: true, runId: true },
    }),
    prisma.departmentHandoff.findMany({
      where: { tenantId, message: { contains: q, mode: "insensitive" } },
      take,
      select: {
        id: true,
        message: true,
        fromWorkItem: { select: { runId: true } },
      },
    }),
    prisma.agent.findMany({
      where: { tenantId, isActive: true, name: { contains: q, mode: "insensitive" } },
      take,
      select: { id: true, name: true, role: true },
    }),
    prisma.artifact.findMany({
      where: {
        tenantId,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { previewText: { contains: q, mode: "insensitive" } },
        ],
      },
      take,
      select: { id: true, title: true, runId: true },
    }),
    prisma.documentComment.findMany({
      where: { tenantId, body: { contains: q, mode: "insensitive" } },
      take,
      select: { id: true, body: true, runId: true, docKey: true },
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
  for (const decision of decisions) {
    results.push({
      type: "decision",
      id: decision.id,
      title: decision.workflowName,
      subtitle: "Decisión",
      href: decision.runId ? `/office/encargos/${decision.runId}` : "/office/inbox?category=decisions",
    });
  }
  for (const handoff of handoffs) {
    const runId = handoff.fromWorkItem?.runId ?? null;
    results.push({
      type: "handoff",
      id: handoff.id,
      title: handoff.message.slice(0, 120),
      subtitle: "Handoff",
      href: runId ? `/office/encargos/${runId}` : "/office/inbox?category=handoffs",
    });
  }
  for (const agent of agents) {
    results.push({
      type: "agent",
      id: agent.id,
      title: agent.name,
      subtitle: agent.role ?? "Agente",
      href: `/settings/agents`,
    });
  }
  for (const doc of docs) {
    results.push({
      type: "document",
      id: doc.id,
      title: doc.title,
      subtitle: "Documento",
      href: doc.runId ? `/office/encargos/${doc.runId}` : "/office/archive",
    });
  }
  for (const comment of comments) {
    results.push({
      type: "comment",
      id: comment.id,
      title: comment.body.slice(0, 120),
      subtitle: comment.docKey,
      href: `/office/encargos/${comment.runId}`,
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
