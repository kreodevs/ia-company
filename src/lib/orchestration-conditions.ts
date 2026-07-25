import type { CompanyPhase } from "@prisma/client";
import { prisma } from "./prisma.js";
import { findIdeaToEvaluate } from "./pipeline-utils.js";
import { listPipelineIdeas, listTenantProducts } from "./product-registry.js";
import type { ScheduleConditions } from "../types/orchestration.js";

export interface ScheduleConditionContext {
  phase: CompanyPhase;
  pipelineCount: number;
  buildingCount: number;
  growingCount: number;
  hasPendingIdea: boolean;
  pendingDecisions: number;
  orgUnitsWithProducts: Set<string>;
}

export function parseScheduleConditions(raw: unknown): ScheduleConditions | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as ScheduleConditions;
}

export function conditionsAreEmpty(conditions: ScheduleConditions | null | undefined): boolean {
  if (!conditions) return true;
  return Object.values(conditions).every(
    (value) => value === undefined || (Array.isArray(value) && value.length === 0),
  );
}

export function evaluateScheduleConditions(
  conditions: ScheduleConditions | null | undefined,
  context: ScheduleConditionContext,
): { met: boolean; reason?: string } {
  if (!conditions || conditionsAreEmpty(conditions)) {
    return { met: true };
  }

  if (conditions.pipelineEmpty === true && context.pipelineCount > 0) {
    return { met: false, reason: "Pipeline is not empty" };
  }
  if (conditions.pipelineHasIdeas === true && context.pipelineCount === 0) {
    return { met: false, reason: "Pipeline has no ideas" };
  }
  if (conditions.phases?.length && !conditions.phases.includes(context.phase)) {
    return { met: false, reason: `Company phase is ${context.phase}` };
  }
  if (conditions.hasBuildingProduct === true && context.buildingCount === 0) {
    return { met: false, reason: "No building/launching product" };
  }
  if (conditions.hasGrowingProduct === true && context.growingCount === 0) {
    return { met: false, reason: "No growing product" };
  }
  if (conditions.hasPendingIdea === true && !context.hasPendingIdea) {
    return { met: false, reason: "No pending idea to evaluate" };
  }
  if (conditions.noPendingDecisions === true && context.pendingDecisions > 0) {
    return { met: false, reason: "Human decisions pending" };
  }
  if (conditions.orgUnitId && !context.orgUnitsWithProducts.has(conditions.orgUnitId)) {
    return { met: false, reason: "Department has no linked work items" };
  }

  return { met: true };
}

export async function loadScheduleConditionContext(
  tenantId: string,
): Promise<ScheduleConditionContext> {
  const [consensus, products, ideas, pendingDecisions, orgLinkedRows] = await Promise.all([
    prisma.tenantConsensus.findUnique({ where: { tenantId } }),
    listTenantProducts(tenantId),
    listPipelineIdeas(tenantId),
    prisma.decisionProposal.count({
      where: { tenantId, status: { in: ["pending_review", "drilling"] } },
    }),
    prisma.tenantProduct.findMany({
      where: { tenantId, orgUnitId: { not: null }, phase: { not: "archived" } },
      select: { orgUnitId: true },
    }),
  ]);

  const phase = consensus?.companyPhase ?? "exploring";
  const pendingIdea = pendingDecisions > 0 ? null : findIdeaToEvaluate(ideas, products);

  return {
    phase,
    pipelineCount: ideas.length,
    buildingCount: products.filter((p) => p.phase === "building" || p.phase === "launching").length,
    growingCount: products.filter((p) => p.phase === "growing").length,
    hasPendingIdea: pendingIdea !== null,
    pendingDecisions,
    orgUnitsWithProducts: new Set(
      orgLinkedRows.map((row) => row.orgUnitId).filter((id): id is string => Boolean(id)),
    ),
  };
}

export async function tenantHasActiveRun(tenantId: string): Promise<boolean> {
  const active = await prisma.executionRun.count({
    where: {
      tenantId,
      status: { in: ["PENDING", "RUNNING", "DELEGATED", "AWAITING_USER"] },
    },
  });
  return active > 0;
}
