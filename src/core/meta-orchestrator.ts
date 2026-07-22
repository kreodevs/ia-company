import type { CompanyPhase, TenantProduct } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { mergeConsensusIntoMemory } from "../lib/consensus.js";
import { loadProductConsensusInitialMemory } from "../lib/product-consensus.js";
import { convergencePromptSection } from "../lib/convergence.js";
import { findIdeaToEvaluate } from "../lib/pipeline-utils.js";
import {
  countBuildingProducts,
  ensureDefaultProducts,
  ensureTenantCycleState,
  listPipelineIdeas,
  listTenantProducts,
  recordProductRun,
  setFocusProduct,
} from "../lib/product-registry.js";
import { getTenantInterestCategories } from "../lib/tenant-interests.js";
import type { SharedMemory } from "../types/index.js";
import { WORKFLOW_NAMES } from "../lib/workflow-names.js";
export interface MetaOrchestratorDecision {
  workflowId: string;
  workflowName: string;
  productId?: string;
  productSlug?: string;
  reason: string;
  initialMemory: SharedMemory;
}

async function findTenantWorkflowByName(tenantId: string, name: string) {
  return prisma.workflow.findFirst({
    where: { tenantId, name },
    select: { id: true, name: true },
  });
}

function phaseDefaultWorkflow(phase: CompanyPhase, hasBuilding: boolean): string {
  if (phase === "exploring") return WORKFLOW_NAMES.OPPORTUNITY_DISCOVERY;
  if (phase === "validating") return WORKFLOW_NAMES.NEW_PRODUCT_EVALUATION;
  if (phase === "building" || hasBuilding) return WORKFLOW_NAMES.FEATURE_DEVELOPMENT;
  if (phase === "launching") return WORKFLOW_NAMES.PRODUCT_LAUNCH;
  return WORKFLOW_NAMES.PRICING_MONETIZATION;
}

export async function resolveMetaOrchestratorDecision(
  tenantId: string,
): Promise<MetaOrchestratorDecision> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  await ensureDefaultProducts(tenantId, tenant.slug);

  const [consensus, cycle, products, ideas, interests, pendingProposals] = await Promise.all([
    prisma.tenantConsensus.findUnique({ where: { tenantId } }),
    ensureTenantCycleState(tenantId),
    listTenantProducts(tenantId),
    listPipelineIdeas(tenantId),
    getTenantInterestCategories(tenantId),
    prisma.decisionProposal.count({
      where: { tenantId, status: { in: ["pending_review", "drilling"] } },
    }),
  ]);

  const buildingProducts = products.filter((p) => p.phase === "building" || p.phase === "launching");
  const growingProducts = products.filter((p) => p.phase === "growing");
  const pendingIdea = pendingProposals > 0 ? null : findIdeaToEvaluate(ideas, products);

  let focusProduct: TenantProduct | null =
    products.find((p) => p.id === cycle.focusProductId) ??
    buildingProducts[0] ??
    growingProducts[0] ??
    null;

  let workflowName: string;
  let reason: string;

  if (pendingIdea && (cycle.phase === "validating" || cycle.phase === "exploring")) {
    workflowName = WORKFLOW_NAMES.NEW_PRODUCT_EVALUATION;
    reason = `Evaluate pipeline idea: ${pendingIdea.title}`;
  } else if (buildingProducts.length > 0 && focusProduct) {
    workflowName =
      focusProduct.phase === "launching"
        ? WORKFLOW_NAMES.PRODUCT_LAUNCH
        : WORKFLOW_NAMES.FEATURE_DEVELOPMENT;
    reason = `Build product ${focusProduct.slug}`;
  } else if (growingProducts.length > 0 && ideas.length === 0) {
    focusProduct = growingProducts[0];
    workflowName =
      cycle.cycleNumber % 2 === 0
        ? WORKFLOW_NAMES.PRICING_MONETIZATION
        : WORKFLOW_NAMES.PRODUCT_LAUNCH;
    reason = `Grow product ${focusProduct.slug}`;
  } else if (ideas.length === 0 || cycle.phase === "exploring") {
    workflowName = WORKFLOW_NAMES.OPPORTUNITY_DISCOVERY;
    reason = "Discover new product opportunities (multi-product pipeline)";
    focusProduct = null;
  } else {
    workflowName = phaseDefaultWorkflow(
      consensus?.companyPhase ?? cycle.phase,
      buildingProducts.length > 0,
    );
    reason = `Company phase ${consensus?.companyPhase ?? cycle.phase}`;
  }

  const workflow =
    (await findTenantWorkflowByName(tenantId, workflowName)) ??
    (await prisma.workflow.findFirst({
      where: { tenantId },
      orderBy: { name: "asc" },
    }));

  if (!workflow) throw new Error("No workflows configured for tenant");

  if (focusProduct) {
    await setFocusProduct(tenantId, focusProduct.id);
  }

  const baseMemory = mergeConsensusIntoMemory(consensus, {
    cycleNumber: cycle.cycleNumber,
    companyPhase: consensus?.companyPhase ?? cycle.phase,
    focusProductSlug: focusProduct?.slug,
    focusProductName: focusProduct?.name,
    pipelineIdea: pendingIdea?.title,
    metaReason: reason,
  });

  if (focusProduct) {
    const productMemory = await loadProductConsensusInitialMemory(
      tenantId,
      focusProduct.id,
      baseMemory,
    );
    baseMemory.consensus = productMemory.consensus;
    baseMemory.nextAction = productMemory.nextAction;
    baseMemory.task = productMemory.task;
  }

  baseMemory.convergenceRules = convergencePromptSection(
    cycle.cycleNumber,
    consensus?.companyPhase ?? cycle.phase,
    interests,
  );

  if (pendingIdea) {
    baseMemory.task = `Evaluate idea "${pendingIdea.title}": ${pendingIdea.description ?? ""}`.trim();
  } else if (pendingProposals > 0) {
    baseMemory.task = `A human decision is pending on a proposed go/no-go. Pause: review at /ops/decisions.`;
  } else if (focusProduct) {
    baseMemory.task = `Advance product "${focusProduct.name}" (${focusProduct.slug}) in the product workspace root (already set to projects/${focusProduct.slug}/ at platform level).`;
  }

  const buildingCount = await countBuildingProducts(tenantId);
  baseMemory.buildingProductCount = buildingCount;

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    productId: focusProduct?.id,
    productSlug: focusProduct?.slug,
    reason,
    initialMemory: baseMemory,
  };
}

export async function executeMetaScheduleRun(tenantId: string): Promise<string> {
  const decision = await resolveMetaOrchestratorDecision(tenantId);
  const { executeWorkflowInBackground } = await import("../core/engine.js");

  const runId = await executeWorkflowInBackground(decision.workflowId, {
    tenantId,
    mergeConsensus: false,
    syncConsensus: true,
    initialMemory: decision.initialMemory,
    productId: decision.productId,
    productSlug: decision.productSlug,
    workflowName: decision.workflowName,
    metaReason: decision.reason,
  });

  if (decision.productId) {
    await recordProductRun(decision.productId, runId);
  }

  return runId;
}

export async function ensureMetaSchedule(tenantId: string) {
  const existing = await prisma.autonomousSchedule.findFirst({
    where: { tenantId, scheduleKind: "meta" },
  });
  if (existing) return existing;

  return prisma.autonomousSchedule.create({
    data: {
      tenantId,
      scheduleKind: "meta",
      name: "Autonomous company (meta)",
      intervalSec: 1800,
      enabled: true,
      nextRunAt: new Date(),
    },
  });
}
