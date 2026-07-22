import { mergeConsensusIntoMemory } from "./consensus.js";
import { convergencePromptSection } from "./convergence.js";
import { findProductForIdea } from "./pipeline-utils.js";
import { prisma } from "./prisma.js";
import {
  ensureTenantCycleState,
  listTenantProducts,
  markIdeaGoNoGo,
} from "./product-registry.js";
import { WORKFLOW_NAMES } from "./workflow-names.js";

export async function enqueueIdeaEvaluation(tenantId: string, ideaId: string): Promise<string> {
  const idea = await prisma.pipelineIdea.findFirst({
    where: { id: ideaId, tenantId },
  });
  if (!idea) throw new Error("Pipeline idea not found");

  const products = await listTenantProducts(tenantId);
  if (findProductForIdea(idea, products)) {
    throw new Error("A product already exists for this idea");
  }

  if (idea.goNoGo === "pending") {
    await markIdeaGoNoGo(ideaId, "go");
  }

  const workflow = await prisma.workflow.findFirst({
    where: { tenantId, name: WORKFLOW_NAMES.NEW_PRODUCT_EVALUATION },
  });
  if (!workflow) throw new Error("Evaluation workflow is not configured for this tenant");

  const [consensus, cycle] = await Promise.all([
    prisma.tenantConsensus.findUnique({ where: { tenantId } }),
    ensureTenantCycleState(tenantId),
  ]);

  const initialMemory = mergeConsensusIntoMemory(consensus, {
    task: `Evaluate idea "${idea.title}": ${idea.description ?? ""}`.trim(),
    pipelineIdea: idea.title,
    metaReason: `Human approved idea: ${idea.title}`,
    cycleNumber: cycle.cycleNumber,
    companyPhase: consensus?.companyPhase ?? cycle.phase,
  });
  initialMemory.convergenceRules = convergencePromptSection(
    cycle.cycleNumber,
    consensus?.companyPhase ?? cycle.phase,
  );

  const { executeWorkflowInBackground } = await import("../core/engine.js");
  return executeWorkflowInBackground(workflow.id, {
    tenantId,
    mergeConsensus: false,
    syncConsensus: true,
    initialMemory,
  });
}
