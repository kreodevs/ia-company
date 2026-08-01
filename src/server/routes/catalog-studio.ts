import type { FastifyInstance } from "fastify";
import { applyAgentProposal, proposeAgentWithLlm } from "../../lib/agent-studio.js";
import { logAudit } from "../../lib/audit.js";
import type {
  AgentStudioProposal,
  SkillStudioProposal,
  WorkflowEnrichmentProposal,
  WorkflowStudioProposal,
} from "../../lib/catalog-studio-types.js";
import { applySkillProposal, proposeSkillWithLlm } from "../../lib/skill-studio.js";
import {
  applyWorkflowEnrichment,
  applyWorkflowProposal,
  proposeWorkflowEnrichmentWithLlm,
  proposeWorkflowWithLlm,
} from "../../lib/workflow-studio.js";
import { analyzeWorkflowImpact } from "../../lib/workflow-impact.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";

export async function catalogStudioRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.post<{ Body: { brief: string } }>("/catalog-studio/skills/propose", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const brief = request.body?.brief?.trim();
      if (!brief) return reply.status(400).send({ error: "brief is required" });
      const proposal = await proposeSkillWithLlm(tenantId, brief);
      await logAudit(request, "catalog_studio.skill.propose", {
        briefLength: brief.length,
        reuse: Boolean(proposal.reuse),
        mungerApproved: proposal.mungerReview?.approved ?? true,
      });
      return proposal;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Body: { proposal: SkillStudioProposal; approved: boolean } }>(
    "/catalog-studio/skills/apply",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const proposal = request.body?.proposal;
        if (!proposal?.brief) {
          return reply.status(400).send({ error: "proposal is required" });
        }
        const result = await applySkillProposal(tenantId, {
          proposal,
          approved: request.body.approved === true,
        });
        await logAudit(request, "catalog_studio.skill.apply", {
          skillName: result.skill?.name,
          created: result.created,
          reused: result.reused,
        });
        return reply.status(result.created ? 201 : 200).send(result);
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{ Body: { brief: string; orgUnitId?: string } }>(
    "/catalog-studio/agents/propose",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const brief = request.body?.brief?.trim();
        if (!brief) return reply.status(400).send({ error: "brief is required" });
        const proposal = await proposeAgentWithLlm(tenantId, brief, {
          orgUnitId: request.body.orgUnitId,
        });
        await logAudit(request, "catalog_studio.agent.propose", {
          briefLength: brief.length,
          reuse: Boolean(proposal.reuse),
          newSkills: proposal.newSkills.map((s) => s.name),
          mungerApproved: proposal.mungerReview?.approved ?? true,
        });
        return proposal;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{
    Body: {
      proposal: AgentStudioProposal;
      approved: boolean;
      approvedNewSkillNames?: string[];
      orgUnitId?: string;
    };
  }>("/catalog-studio/agents/apply", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const proposal = request.body?.proposal;
      if (!proposal?.brief) {
        return reply.status(400).send({ error: "proposal is required" });
      }
      const result = await applyAgentProposal(tenantId, {
        proposal,
        approved: request.body.approved === true,
        approvedNewSkillNames: request.body.approvedNewSkillNames,
        orgUnitId: request.body.orgUnitId,
      });
      await logAudit(request, "catalog_studio.agent.apply", {
        agentName: result.agent?.name,
        created: result.created,
        reused: result.reused,
        skillsCreated: result.skillsCreated,
        orgUnitId: request.body.orgUnitId ?? null,
      });
      return reply.status(result.created ? 201 : 200).send(result);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Body: { brief: string; answers?: Record<string, string> } }>(
    "/catalog-studio/workflows/propose",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const brief = request.body?.brief?.trim();
        if (!brief) return reply.status(400).send({ error: "brief is required" });
        const proposal = await proposeWorkflowWithLlm(tenantId, brief, request.body?.answers);
        await logAudit(request, "catalog_studio.workflow.propose", {
          briefLength: brief.length,
          clarified: Boolean(request.body?.answers && Object.keys(request.body.answers).length),
          needsClarification: Boolean(proposal.needsClarification),
          stepCount: proposal.workflow?.steps.length ?? 0,
          mungerApproved: proposal.mungerReview?.approved ?? true,
        });
        return proposal;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{
    Body: {
      proposal: WorkflowStudioProposal;
      approved: boolean;
      approvedNewAgentNames?: string[];
      approvedNewSkillNames?: string[];
    };
  }>("/catalog-studio/workflows/apply", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const proposal = request.body?.proposal;
      if (!proposal?.brief) {
        return reply.status(400).send({ error: "proposal is required" });
      }
      const result = await applyWorkflowProposal(tenantId, {
        proposal,
        approved: request.body.approved === true,
        approvedNewAgentNames: request.body.approvedNewAgentNames,
        approvedNewSkillNames: request.body.approvedNewSkillNames,
      });
      await logAudit(request, "catalog_studio.workflow.apply", {
        workflowId: result.workflow?.id,
        workflowName: result.workflow?.name,
        agentsCreated: result.agentsCreated,
        skillsCreated: result.skillsCreated,
      });
      return reply.status(201).send(result);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{
    Params: { workflowId: string };
    Querystring: { proposedName?: string; proposedStepCount?: string; previousStepCount?: string };
  }>("/catalog-studio/workflows/:workflowId/impact", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { workflowId } = request.params;
      const proposedStepCount = request.query.proposedStepCount
        ? Number.parseInt(request.query.proposedStepCount, 10)
        : undefined;
      const previousStepCount = request.query.previousStepCount
        ? Number.parseInt(request.query.previousStepCount, 10)
        : undefined;
      const impact = await analyzeWorkflowImpact(tenantId, workflowId, {
        proposedName: request.query.proposedName,
        proposedStepCount: Number.isFinite(proposedStepCount) ? proposedStepCount : undefined,
        previousStepCount: Number.isFinite(previousStepCount) ? previousStepCount : undefined,
      });
      return impact;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Body: { workflowId: string; brief: string; answers?: Record<string, string> } }>(
    "/catalog-studio/workflows/enrich/propose",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const workflowId = request.body?.workflowId?.trim();
        const brief = request.body?.brief?.trim();
        if (!workflowId) return reply.status(400).send({ error: "workflowId is required" });
        if (!brief) return reply.status(400).send({ error: "brief is required" });
        const proposal = await proposeWorkflowEnrichmentWithLlm(
          tenantId,
          workflowId,
          brief,
          request.body?.answers,
        );
        await logAudit(request, "catalog_studio.workflow.enrich_propose", {
          workflowId,
          briefLength: brief.length,
          needsClarification: Boolean(proposal.needsClarification),
          stepCount: proposal.workflow?.steps.length ?? 0,
          referenceCount: proposal.impact?.referenceCount ?? 0,
          mungerApproved: proposal.mungerReview?.approved ?? true,
        });
        return proposal;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.post<{
    Body: {
      workflowId: string;
      proposal: WorkflowEnrichmentProposal;
      approved: boolean;
      approvedNewAgentNames?: string[];
      approvedNewSkillNames?: string[];
      allowRename?: boolean;
    };
  }>("/catalog-studio/workflows/enrich/apply", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const workflowId = request.body?.workflowId?.trim();
      const proposal = request.body?.proposal;
      if (!workflowId) return reply.status(400).send({ error: "workflowId is required" });
      if (!proposal?.brief) {
        return reply.status(400).send({ error: "proposal is required" });
      }
      const result = await applyWorkflowEnrichment(tenantId, {
        workflowId,
        proposal,
        approved: request.body.approved === true,
        approvedNewAgentNames: request.body.approvedNewAgentNames,
        approvedNewSkillNames: request.body.approvedNewSkillNames,
        allowRename: request.body.allowRename === true,
      });
      await logAudit(request, "catalog_studio.workflow.enrich_apply", {
        workflowId: result.workflow?.id,
        workflowName: result.workflow?.name,
        agentsCreated: result.agentsCreated,
        skillsCreated: result.skillsCreated,
      });
      return reply.status(200).send(result);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
