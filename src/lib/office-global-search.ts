import { DepartmentWorkStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { VIRTUAL_OFFICE_DEPARTMENTS } from "./office-departments.js";

interface SearchIntent {
  departmentSlug?: string;
  blockedOnly: boolean;
  awaitingApproval: boolean;
  freeText: string;
}

function parseSearchIntent(query: string): SearchIntent {
  const lower = query.toLowerCase();
  let departmentSlug: string | undefined;
  if (lower.includes("ingenier")) departmentSlug = "engineering";
  else if (lower.includes("estrateg")) departmentSlug = "strategy";
  else if (lower.includes("producto")) departmentSlug = "product";
  else if (lower.includes("marketing") || lower.includes("negocio")) departmentSlug = "business";
  else {
    for (const def of VIRTUAL_OFFICE_DEPARTMENTS) {
      if (lower.includes(def.slug)) {
        departmentSlug = def.slug;
        break;
      }
    }
  }
  return {
    departmentSlug,
    blockedOnly: lower.includes("bloquead"),
    awaitingApproval: lower.includes("aprobación") || lower.includes("aprobacion"),
    freeText: query.trim(),
  };
}

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

  const intent = parseSearchIntent(q);
  const results: OfficeSearchResult[] = [];
  const take = Math.min(10, limit);

  if (intent.blockedOnly) {
    const blockedRuns = await prisma.executionRun.findMany({
      where: {
        tenantId,
        departmentWorkItems: {
          some: {
            status: DepartmentWorkStatus.blocked,
            ...(intent.departmentSlug ? { departmentSlug: intent.departmentSlug } : {}),
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take,
      select: { id: true, sharedMemory: true, companyGoal: { select: { name: true } } },
    });
    for (const run of blockedRuns) {
      const memory = run.sharedMemory as Record<string, unknown>;
      const task =
        (typeof memory.task === "string" && memory.task) ||
        (typeof memory.officeRequest === "string" && memory.officeRequest) ||
        run.id;
      results.push({
        type: "encargo",
        id: run.id,
        title: String(task).slice(0, 120),
        subtitle: intent.departmentSlug
          ? `Bloqueado · ${intent.departmentSlug}`
          : "Encargo bloqueado",
        href: `/office/encargos/${run.id}`,
      });
    }
  }

  if (intent.awaitingApproval) {
    const pending = await prisma.decisionProposal.findMany({
      where: { tenantId, status: { in: ["pending_review", "drilling"] } },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, workflowName: true, runId: true },
    });
    for (const decision of pending) {
      results.push({
        type: "decision",
        id: decision.id,
        title: decision.workflowName,
        subtitle: "Esperando aprobación",
        href: decision.runId
          ? `/office/encargos/${decision.runId}`
          : "/office/inbox?category=decisions",
      });
    }
  }

  if (results.length >= limit) return results.slice(0, limit);

  const textQ = intent.freeText;
  const [runs, goals, initiatives, orgUnits, decisions, handoffs, agents, docs, comments] =
    await Promise.all([
    prisma.executionRun.findMany({
      where: {
        tenantId,
        OR: [
          { id: { contains: textQ, mode: "insensitive" } },
          { companyGoal: { name: { contains: textQ, mode: "insensitive" } } },
          { initiative: { name: { contains: textQ, mode: "insensitive" } } },
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
      where: { tenantId, name: { contains: textQ, mode: "insensitive" } },
      take,
      select: { id: true, name: true },
    }),
    prisma.initiative.findMany({
      where: { tenantId, name: { contains: textQ, mode: "insensitive" } },
      take,
      select: { id: true, name: true, companyGoalId: true },
    }),
    prisma.orgUnit.findMany({
      where: { tenantId, isActive: true, name: { contains: textQ, mode: "insensitive" } },
      take,
      select: { id: true, name: true, slug: true },
    }),
    prisma.decisionProposal.findMany({
      where: {
        tenantId,
        OR: [
          { workflowName: { contains: textQ, mode: "insensitive" } },
          { rationale: { contains: textQ, mode: "insensitive" } },
        ],
      },
      take,
      select: { id: true, workflowName: true, runId: true },
    }),
    prisma.departmentHandoff.findMany({
      where: { tenantId, message: { contains: textQ, mode: "insensitive" } },
      take,
      select: {
        id: true,
        message: true,
        fromWorkItem: { select: { runId: true } },
      },
    }),
    prisma.agent.findMany({
      where: { tenantId, isActive: true, name: { contains: textQ, mode: "insensitive" } },
      take,
      select: { id: true, name: true, role: true },
    }),
    prisma.artifact.findMany({
      where: {
        tenantId,
        OR: [
          { title: { contains: textQ, mode: "insensitive" } },
          { previewText: { contains: textQ, mode: "insensitive" } },
        ],
      },
      take,
      select: { id: true, title: true, runId: true },
    }),
    prisma.documentComment.findMany({
      where: { tenantId, body: { contains: textQ, mode: "insensitive" } },
      take,
      select: { id: true, body: true, runId: true, docKey: true },
    }),
  ]);

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
