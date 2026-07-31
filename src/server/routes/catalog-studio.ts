import type { FastifyInstance } from "fastify";
import { applyAgentProposal, proposeAgentWithLlm } from "../../lib/agent-studio.js";
import { logAudit } from "../../lib/audit.js";
import type {
  AgentStudioProposal,
  SkillStudioProposal,
  WorkflowStudioProposal,
} from "../../lib/catalog-studio-types.js";
import { applySkillProposal, proposeSkillWithLlm } from "../../lib/skill-studio.js";
import { applyWorkflowProposal, proposeWorkflowWithLlm } from "../../lib/workflow-studio.js";
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
}
