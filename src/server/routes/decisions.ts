import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { logAudit } from "../../lib/audit.js";
import { enqueueWorkflowRun } from "../../worker/queue.js";
import {
  applyApprovedProposal,
  applyRejectedProposal,
  attachDrilldownRun,
  cancelProposal,
  getDecisionProposal,
  listDecisionProposals,
} from "../../lib/decision-proposals.js";
import { mergeConsensusIntoMemory } from "../../lib/consensus.js";
import { convergencePromptSection } from "../../lib/convergence.js";
import { ensureTenantCycleState, listTenantProducts } from "../../lib/product-registry.js";
import { getTenantInterestCategories } from "../../lib/tenant-interests.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";
import { WORKFLOW_NAMES } from "../../lib/workflow-names.js";
import { loadDecisionRunDocuments } from "../../lib/office-encargos.js";

function resolveDecisionActor(
  request: { session: { email?: string } | null },
  bodyEmail?: string,
): string | undefined {
  const fromBody = bodyEmail?.trim();
  if (fromBody) return fromBody;
  const fromSession = request.session?.email?.trim();
  return fromSession || undefined;
}

export async function decisionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.get("/decisions", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      return listDecisionProposals(tenantId);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { id: string } }>("/decisions/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const proposal = await getDecisionProposal(request.params.id, tenantId);
      if (!proposal) return reply.status(404).send({ error: "Proposal not found" });
      return proposal;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { id: string } }>("/decisions/:id/documents", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const proposal = await getDecisionProposal(request.params.id, tenantId);
      if (!proposal) return reply.status(404).send({ error: "Proposal not found" });
      if (!proposal.runId) return { documents: [] };
      const documents = await loadDecisionRunDocuments(tenantId, proposal.runId);
      return { documents };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Params: { id: string }; Body: { actorEmail?: string } }>(
    "/decisions/:id/approve",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const actor = resolveDecisionActor(request, request.body?.actorEmail);
        const proposal = await getDecisionProposal(request.params.id, tenantId);
        if (!proposal) return reply.status(404).send({ error: "Proposal not found" });
        if (proposal.status !== "pending_review" && proposal.status !== "drilling") {
          return reply.status(409).send({ error: `Proposal already ${proposal.status}` });
        }
        await applyApprovedProposal(proposal.id, tenantId, actor);
        await logAudit(request, "decision.approve", { proposalId: proposal.id });
        return getDecisionProposal(proposal.id, tenantId);
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{ Params: { id: string }; Body: { actorEmail?: string } }>(
    "/decisions/:id/reject",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const actor = resolveDecisionActor(request, request.body?.actorEmail);
        const proposal = await getDecisionProposal(request.params.id, tenantId);
        if (!proposal) return reply.status(404).send({ error: "Proposal not found" });
        if (proposal.status !== "pending_review" && proposal.status !== "drilling") {
          return reply.status(409).send({ error: `Proposal already ${proposal.status}` });
        }
        await applyRejectedProposal(proposal.id, tenantId, actor);
        await logAudit(request, "decision.reject", { proposalId: proposal.id });
        return getDecisionProposal(proposal.id, tenantId);
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{ Params: { id: string }; Body: { pivot: string; actorEmail?: string } }>(
    "/decisions/:id/pivot",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const pivot = String(request.body?.pivot ?? "").trim();
        if (!pivot) return reply.status(400).send({ error: "pivot prompt is required" });
        const proposal = await getDecisionProposal(request.params.id, tenantId);
        if (!proposal) return reply.status(404).send({ error: "Proposal not found" });
        if (proposal.status !== "pending_review" && proposal.status !== "drilling") {
          return reply.status(409).send({ error: `Proposal already ${proposal.status}` });
        }
        const drilldownWorkflow =
          (await prisma.workflow.findFirst({
            where: { tenantId, name: WORKFLOW_NAMES.RESEARCH_DRILLDOWN },
          })) ??
          (await (async () => {
            const { ensurePlatformWorkflowOnTenant } = await import("../lib/clone-templates.js");
            return ensurePlatformWorkflowOnTenant(tenantId, WORKFLOW_NAMES.RESEARCH_DRILLDOWN);
          })());
        if (!drilldownWorkflow) {
          return reply.status(412).send({
            error: `Workflow ${WORKFLOW_NAMES.RESEARCH_DRILLDOWN} is not configured for this tenant`,
          });
        }

        const { assertTenantCanLaunchRun } = await import("../../lib/run-guards.js");
        await assertTenantCanLaunchRun(tenantId, { allowPendingDecisions: true });

        const [consensus, cycle, interests, products] = await Promise.all([
          prisma.tenantConsensus.findUnique({ where: { tenantId } }),
          ensureTenantCycleState(tenantId),
          getTenantInterestCategories(tenantId),
          listTenantProducts(tenantId),
        ]);
        const initialMemory = mergeConsensusIntoMemory(consensus, {
          task: `Drill-down on idea "${proposal.idea.title}": ${pivot}`,
          pipelineIdea: proposal.idea.title,
          pivotPrompt: pivot,
          previousProposalId: proposal.id,
          metaReason: `Human requested more research: ${pivot}`,
          cycleNumber: cycle.cycleNumber,
          companyPhase: consensus?.companyPhase ?? cycle.phase,
        });
        initialMemory.convergenceRules = convergencePromptSection(
          cycle.cycleNumber,
          consensus?.companyPhase ?? cycle.phase,
          interests,
        );
        initialMemory.tenantProducts = products.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          phase: p.phase,
        }));

        const run = await prisma.executionRun.create({
          data: {
            workflowId: drilldownWorkflow.id,
            tenantId,
            status: "PENDING",
            sharedMemory: initialMemory as object,
          },
        });
        await enqueueWorkflowRun({
          runId: run.id,
          workflowId: drilldownWorkflow.id,
          tenantId,
          initialMemory: initialMemory as Record<string, unknown>,
          mergeConsensus: false,
          syncConsensus: true,
          workflowName: WORKFLOW_NAMES.RESEARCH_DRILLDOWN,
        });
        await attachDrilldownRun(proposal.id, run.id);
        await prisma.decisionProposal.update({
          where: { id: proposal.id },
          data: { pivotPrompt: pivot },
        });
        await logAudit(request, "decision.pivot", { proposalId: proposal.id, runId: run.id });
        return getDecisionProposal(proposal.id, tenantId);
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{ Params: { id: string } }>("/decisions/:id/cancel", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const proposal = await getDecisionProposal(request.params.id, tenantId);
      if (!proposal) return reply.status(404).send({ error: "Proposal not found" });
      await cancelProposal(proposal.id, tenantId);
      await logAudit(request, "decision.cancel", { proposalId: proposal.id });
      return getDecisionProposal(proposal.id, tenantId);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}