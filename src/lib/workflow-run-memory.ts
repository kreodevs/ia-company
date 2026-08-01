import { mergeConsensusIntoMemory } from "./consensus.js";
import { convergencePromptSection } from "./convergence.js";
import { findIdeaToEvaluate } from "./pipeline-utils.js";
import { prisma } from "./prisma.js";
import {
  ensureTenantCycleState,
  listPipelineIdeas,
  listTenantProducts,
} from "./product-registry.js";
import { loadProductConsensusInitialMemory } from "./product-consensus.js";
import {
  attachScopeContract,
  buildCompanyScopeContract,
  buildProductScopeContract,
  isCompanyScopedWorkflow,
  shouldMergeProductConsensus,
} from "./scope-contract.js";
import { getTenantInterestCategories } from "./tenant-interests.js";
import type { SharedMemory } from "../types/index.js";
import { WORKFLOW_NAMES } from "./workflow-names.js";

export interface BuildScheduledWorkflowMemoryOptions {
  reason: string;
  productId?: string;
  productSlug?: string;
  orgMemory?: Record<string, unknown>;
}

interface WorkflowTaskContext {
  interests: string[];
  pendingIdea?: { title: string; description: string | null };
  focusProduct?: { name: string; slug: string };
}

export function taskForScheduledWorkflow(
  workflowName: string,
  ctx: WorkflowTaskContext,
): string {
  switch (workflowName) {
    case WORKFLOW_NAMES.OPPORTUNITY_DISCOVERY:
      return ctx.interests.length > 0
        ? "Discover new product opportunities aligned with tenant interests. Research real market demand and output topIdeas[] with 3 short titles."
        : "Discover new product opportunities. Research real market demand and output topIdeas[] with 3 short titles.";
    case WORKFLOW_NAMES.NEW_PRODUCT_EVALUATION:
      if (ctx.pendingIdea) {
        return `Evaluate idea "${ctx.pendingIdea.title}": ${ctx.pendingIdea.description ?? ""}`.trim();
      }
      return "Evaluate the top pending pipeline idea and output goNoGo.";
    case WORKFLOW_NAMES.WEEKLY_REVIEW:
      return "Run the weekly company review: operations, sales, finance, QA, and CEO summary.";
    case WORKFLOW_NAMES.RESEARCH_DRILLDOWN:
      return "Deep research on the pipeline idea flagged for drill-down after human pivot.";
    default:
      if (ctx.focusProduct) {
        return `Advance product "${ctx.focusProduct.name}" (${ctx.focusProduct.slug}).`;
      }
      return "Execute the scheduled workflow step.";
  }
}

export async function buildScheduledWorkflowInitialMemory(
  tenantId: string,
  workflowName: string,
  options: BuildScheduledWorkflowMemoryOptions,
): Promise<SharedMemory> {
  const [consensus, cycle, interests, ideas, products] = await Promise.all([
    prisma.tenantConsensus.findUnique({ where: { tenantId } }),
    ensureTenantCycleState(tenantId),
    getTenantInterestCategories(tenantId),
    listPipelineIdeas(tenantId),
    listTenantProducts(tenantId),
  ]);

  const pendingIdea = findIdeaToEvaluate(ideas, products);
  const companyScoped = isCompanyScopedWorkflow(workflowName);
  let focusProduct =
    !companyScoped && options.productId != null
      ? (products.find((product) => product.id === options.productId) ?? null)
      : null;
  if (!companyScoped && !focusProduct && cycle.focusProductId) {
    focusProduct = products.find((product) => product.id === cycle.focusProductId) ?? null;
  }

  const phase = consensus?.companyPhase ?? cycle.phase;
  const task = taskForScheduledWorkflow(workflowName, {
    interests,
    pendingIdea,
    focusProduct: focusProduct
      ? { name: focusProduct.name, slug: focusProduct.slug }
      : undefined,
  });

  const memoryOverride: SharedMemory = {
    task,
    nextAction: task,
    metaReason: options.reason,
    cycleNumber: cycle.cycleNumber,
    companyPhase: phase,
    pipelineIdea: pendingIdea?.title,
    ...(options.orgMemory ?? {}),
  };
  if (!companyScoped && focusProduct) {
    memoryOverride.focusProductSlug = focusProduct.slug;
    memoryOverride.focusProductName = focusProduct.name;
    memoryOverride.productId = focusProduct.id;
  }

  const base = mergeConsensusIntoMemory(consensus, memoryOverride);

  base.convergenceRules = convergencePromptSection(cycle.cycleNumber, phase, interests);

  if (companyScoped) {
    const intent =
      workflowName === WORKFLOW_NAMES.WEEKLY_REVIEW
        ? "review"
        : workflowName === WORKFLOW_NAMES.NEW_PRODUCT_EVALUATION
          ? "discovery"
          : "discovery";
    return attachScopeContract(base, buildCompanyScopeContract(intent)) as SharedMemory;
  }

  if (
    focusProduct &&
    shouldMergeProductConsensus({ workflowName, productId: focusProduct.id })
  ) {
    const productMemory = await loadProductConsensusInitialMemory(
      tenantId,
      focusProduct.id,
      {
        ...base,
        focusProductSlug: focusProduct.slug,
        focusProductName: focusProduct.name,
        productId: focusProduct.id,
      },
    );
    return {
      ...productMemory,
      task: base.task,
      nextAction: base.nextAction,
      convergenceRules: base.convergenceRules,
      metaReason: options.reason,
      ...attachScopeContract(
        {},
        buildProductScopeContract({
          productId: focusProduct.id,
          productSlug: focusProduct.slug,
          intent: "operate",
        }),
      ),
    };
  }

  return attachScopeContract(base, buildCompanyScopeContract("operate")) as SharedMemory;
}
