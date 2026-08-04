import type { PipelineIdea } from "@prisma/client";
import { prisma } from "./prisma.js";
import { enqueueIdeaEvaluation } from "./evaluate-idea.js";
import { WORKFLOW_NAMES } from "./workflow-names.js";

export type PipelineIdeaEvaluationPhase =
  | "queued"
  | "evaluating"
  | "ready"
  | "failed";

export interface PipelineIdeaEvaluationMeta {
  evaluationPhase: PipelineIdeaEvaluationPhase | null;
  evaluationRunId: string | null;
  decisionProposalId: string | null;
}

const ACTIVE_RUN_STATUSES = ["PENDING", "RUNNING"] as const;

async function findEvaluationWorkflowId(tenantId: string): Promise<string | null> {
  const workflow = await prisma.workflow.findFirst({
    where: { tenantId, name: WORKFLOW_NAMES.NEW_PRODUCT_EVALUATION },
    select: { id: true },
  });
  return workflow?.id ?? null;
}

async function findActiveEvaluationRun(
  tenantId: string,
  ideaId: string,
  workflowId: string,
) {
  return prisma.executionRun.findFirst({
    where: {
      tenantId,
      workflowId,
      status: { in: [...ACTIVE_RUN_STATUSES] },
      sharedMemory: {
        path: ["pipelineIdeaId"],
        equals: ideaId,
      },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });
}

async function findLatestEvaluationRun(
  tenantId: string,
  ideaId: string,
  workflowId: string,
) {
  return prisma.executionRun.findFirst({
    where: {
      tenantId,
      workflowId,
      sharedMemory: {
        path: ["pipelineIdeaId"],
        equals: ideaId,
      },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });
}

async function findPendingProposal(tenantId: string, ideaId: string) {
  return prisma.decisionProposal.findFirst({
    where: {
      tenantId,
      ideaId,
      status: { in: ["pending_review", "drilling"] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, runId: true },
  });
}

export async function getPipelineIdeaEvaluationMeta(
  tenantId: string,
  idea: Pick<PipelineIdea, "id" | "goNoGo">,
): Promise<PipelineIdeaEvaluationMeta> {
  const proposal = await findPendingProposal(tenantId, idea.id);
  if (proposal) {
    return {
      evaluationPhase: "ready",
      evaluationRunId: proposal.runId,
      decisionProposalId: proposal.id,
    };
  }

  const workflowId = await findEvaluationWorkflowId(tenantId);
  if (!workflowId) {
    return { evaluationPhase: null, evaluationRunId: null, decisionProposalId: null };
  }

  const activeRun = await findActiveEvaluationRun(tenantId, idea.id, workflowId);
  if (activeRun) {
    return {
      evaluationPhase: "evaluating",
      evaluationRunId: activeRun.id,
      decisionProposalId: null,
    };
  }

  if (idea.goNoGo === "go") {
    const latestRun = await findLatestEvaluationRun(tenantId, idea.id, workflowId);
    if (latestRun?.status === "FAILED" || latestRun?.status === "CANCELLED") {
      return {
        evaluationPhase: "failed",
        evaluationRunId: latestRun.id,
        decisionProposalId: null,
      };
    }
    return {
      evaluationPhase: "queued",
      evaluationRunId: latestRun?.id ?? null,
      decisionProposalId: null,
    };
  }

  return { evaluationPhase: null, evaluationRunId: null, decisionProposalId: null };
}

export async function enrichPipelineIdeasWithEvaluation(
  tenantId: string,
  ideas: PipelineIdea[],
): Promise<Array<PipelineIdea & PipelineIdeaEvaluationMeta>> {
  return Promise.all(
    ideas.map(async (idea) => {
      const meta = await getPipelineIdeaEvaluationMeta(tenantId, idea);
      return { ...idea, ...meta };
    }),
  );
}

export async function autoEvaluatePipelineIdeaIfNeeded(
  tenantId: string,
  ideaId: string,
): Promise<string | null> {
  const idea = await prisma.pipelineIdea.findFirst({
    where: { id: ideaId, tenantId },
  });
  if (!idea || idea.goNoGo === "no_go") return null;

  const meta = await getPipelineIdeaEvaluationMeta(tenantId, idea);
  if (meta.evaluationPhase === "evaluating" || meta.evaluationPhase === "ready" || meta.evaluationPhase === "failed") {
    return null;
  }
  if (meta.evaluationPhase === "queued") return meta.evaluationRunId;

  try {
    return await enqueueIdeaEvaluation(tenantId, ideaId, "auto");
  } catch {
    return null;
  }
}

export async function autoEvaluatePendingPipelineIdeas(tenantId: string): Promise<void> {
  const ideas = await prisma.pipelineIdea.findMany({
    where: { tenantId, goNoGo: { in: ["pending", "go"] } },
    orderBy: [{ interestScore: "desc" }, { rank: "asc" }, { createdAt: "asc" }],
  });

  for (const idea of ideas) {
    await autoEvaluatePipelineIdeaIfNeeded(tenantId, idea.id);
  }
}
