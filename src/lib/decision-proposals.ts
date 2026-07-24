import type { DecisionStatus, GoNoGoDecision } from "@prisma/client";
import { prisma } from "./prisma.js";
import {
  bootstrapProduct,
  countBuildingProducts,
  getProductBySlug,
  markIdeaGoNoGo,
  setFocusProduct,
  updateCompanyPhase,
  upsertTenantProduct,
} from "./product-registry.js";
import { slugifyProductName } from "./product-workspace.js";
import { WORKFLOW_NAMES } from "./workflow-names.js";

export interface ProposalEvidence {
  agent: string;
  summary: string;
  field?: string;
}

export interface ProposalInput {
  tenantId: string;
  ideaId: string;
  runId: string | null;
  workflowName: string;
  recommended: GoNoGoDecision;
  rationale: string;
  evidence: ProposalEvidence[];
  pivotPrompt?: string;
}

export async function listDecisionProposals(
  tenantId: string,
  status?: DecisionStatus,
) {
  return prisma.decisionProposal.findMany({
    where: { tenantId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: { idea: true },
  });
}

export async function getDecisionProposal(id: string, tenantId: string) {
  return prisma.decisionProposal.findFirst({
    where: { id, tenantId },
    include: { idea: true },
  });
}

export async function createDecisionProposal(input: ProposalInput) {
  return prisma.decisionProposal.create({
    data: {
      tenantId: input.tenantId,
      ideaId: input.ideaId,
      runId: input.runId,
      workflowName: input.workflowName,
      recommended: input.recommended,
      rationale: input.rationale,
      evidence: input.evidence as unknown as object,
      pivotPrompt: input.pivotPrompt,
      status: "pending_review",
    },
    include: { idea: true },
  });
}

export async function attachDrilldownRun(proposalId: string, runId: string) {
  return prisma.decisionProposal.update({
    where: { id: proposalId },
    data: { status: "drilling", drilldownRunId: runId },
  });
}

export async function setProposalStatus(
  id: string,
  _tenantId: string,
  status: DecisionStatus,
  decidedBy?: string,
) {
  return prisma.decisionProposal.update({
    where: { id },
    data: {
      status,
      decidedBy: decidedBy ?? null,
      decidedAt: status === "pending_review" || status === "drilling" ? null : new Date(),
    },
  });
}

export async function applyApprovedProposal(
  proposalId: string,
  tenantId: string,
  decidedBy?: string,
) {
  const proposal = await prisma.decisionProposal.findFirst({
    where: { id: proposalId, tenantId },
    include: { idea: true },
  });
  if (!proposal) throw new Error("Proposal not found");

  const idea = proposal.idea;
  if (proposal.recommended === "go") {
    const productName = idea.title;
    const productSlug = slugifyProductName(productName);
    if (productSlug) {
      const existing = await getProductBySlug(tenantId, productSlug);
      if (!existing) {
        const building = await countBuildingProducts(tenantId);
        if (building < 2) {
          const product = await bootstrapProduct({
            tenantId,
            slug: productSlug,
            name: productName,
            description: idea.description ?? undefined,
          });
          await setFocusProduct(tenantId, product.id);
          await updateCompanyPhase(tenantId, "building");
        }
      } else {
        await upsertTenantProduct({
          tenantId,
          slug: productSlug,
          name: productName,
          description: idea.description ?? undefined,
          phase: "building",
          goNoGo: "go",
        });
        await setFocusProduct(tenantId, existing.id);
      }
    }
    await markIdeaGoNoGo(idea.id, "go");
  } else if (proposal.recommended === "no_go") {
    await markIdeaGoNoGo(idea.id, "no_go");
    await updateCompanyPhase(tenantId, "exploring");
  }

  await setProposalStatus(proposal.id, tenantId, "approved", decidedBy);
}

export async function applyRejectedProposal(
  proposalId: string,
  tenantId: string,
  decidedBy?: string,
) {
  const proposal = await prisma.decisionProposal.findFirst({
    where: { id: proposalId, tenantId },
    include: { idea: true },
  });
  if (!proposal) throw new Error("Proposal not found");
  await markIdeaGoNoGo(proposal.idea.id, "no_go");
  await updateCompanyPhase(tenantId, "exploring");
  await setProposalStatus(proposal.id, tenantId, "rejected", decidedBy);
}

export async function cancelProposal(proposalId: string, tenantId: string) {
  await setProposalStatus(proposalId, tenantId, "cancelled");
}

export async function countPendingProposals(tenantId: string): Promise<number> {
  return prisma.decisionProposal.count({
    where: { tenantId, status: { in: ["pending_review", "drilling"] } },
  });
}

export function buildRationaleFromMemory(
  agentOutputs: Array<{ agentName: string; output: string }>,
  recommended: GoNoGoDecision,
  fallback: string,
): { rationale: string; evidence: ProposalEvidence[] } {
  const evidence: ProposalEvidence[] = [];
  for (const a of agentOutputs) {
    const trimmed = a.output.trim();
    if (!trimmed) continue;
    const head = trimmed.slice(0, 600);
    evidence.push({ agent: a.agentName, summary: head });
  }
  const headline = recommended === "go" ? "Recommended GO" : "Recommended NO-GO";
  return {
    rationale: `${headline}: ${fallback}`.trim(),
    evidence,
  };
}

export const _WORKFLOW_NAME = WORKFLOW_NAMES.RESEARCH_DRILLDOWN;