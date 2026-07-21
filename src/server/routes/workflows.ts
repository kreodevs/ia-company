import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { executeWorkflowInBackground } from "../../core/engine.js";
import { logAudit } from "../../lib/audit.js";
import { assertTenantCanExecute } from "../../lib/usage-limits.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";
import { updateWorkflowGraph } from "../lib/workflow-graph.js";
import type { CreateWorkflowInput, ExecuteWorkflowInput } from "../../types/index.js";

export async function workflowRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.get("/workflows", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      return prisma.workflow.findMany({
        where: { tenantId },
        include: {
          steps: { include: { agent: true }, orderBy: { stepOrder: "asc" } },
          edges: true,
          _count: { select: { runs: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { id: string } }>("/workflows/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const workflow = await prisma.workflow.findFirst({
        where: { id: request.params.id, tenantId },
        include: {
          steps: {
            include: { agent: { include: { skills: { include: { skill: true } } } } },
            orderBy: { stepOrder: "asc" },
          },
          edges: true,
        },
      });
      if (!workflow) return reply.status(404).send({ error: "Workflow not found" });
      return workflow;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Body: CreateWorkflowInput }>("/workflows", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { steps, edges, tenantId: _ignored, ...data } = request.body;

      const workflow = await prisma.workflow.create({
        data: {
          ...data,
          tenantId,
          steps: steps?.length
            ? {
                create: steps.map((s, i) => ({
                  agentId: s.agentId,
                  stepOrder: s.stepOrder ?? i,
                  label: s.label,
                  positionX: s.positionX ?? 0,
                  positionY: s.positionY ?? i * 150,
                  inputConfig: (s.inputConfig ?? {}) as object,
                  outputConfig: (s.outputConfig ?? {}) as object,
                })),
              }
            : undefined,
        },
        include: { steps: true, edges: true },
      });

      if (edges?.length && workflow.steps.length > 0) {
        await prisma.workflowEdge.createMany({
          data: edges.map((e) => ({
            workflowId: workflow.id,
            sourceStepId: e.sourceStepId,
            targetStepId: e.targetStepId,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
        });
      }

      const full = await prisma.workflow.findUnique({
        where: { id: workflow.id },
        include: { steps: { include: { agent: true } }, edges: true },
      });

      return reply.status(201).send(full);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{ Params: { id: string }; Body: CreateWorkflowInput }>(
    "/workflows/:id",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const { steps, edges, tenantId: _ignored, ...data } = request.body;
        const workflowId = request.params.id;

        const existing = await prisma.workflow.findFirst({ where: { id: workflowId, tenantId } });
        if (!existing) return reply.status(404).send({ error: "Workflow not found" });

        const workflow = await updateWorkflowGraph(workflowId, {
          ...data,
          steps,
          edges,
        });

        return workflow;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.delete<{ Params: { id: string } }>("/workflows/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const existing = await prisma.workflow.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!existing) return reply.status(404).send({ error: "Workflow not found" });
      await prisma.workflow.delete({ where: { id: request.params.id } });
      return reply.status(204).send();
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Params: { id: string }; Body: ExecuteWorkflowInput }>(
    "/workflows/:id/execute",
    {
      config: {
        rateLimit: {
          max: Number(process.env.EXECUTE_RATE_LIMIT_MAX ?? 10),
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const workflow = await prisma.workflow.findFirst({
          where: { id: request.params.id, tenantId },
        });
        if (!workflow) return reply.status(404).send({ error: "Workflow not found" });

        await assertTenantCanExecute(tenantId);

        const runId = await executeWorkflowInBackground(request.params.id, {
          ...request.body,
          tenantId,
          mergeConsensus: request.body?.mergeConsensus ?? true,
          syncConsensus: request.body?.syncConsensus ?? true,
        });

        await logAudit(request, "workflow.execute", {
          workflowId: workflow.id,
          workflowName: workflow.name,
          runId,
        });

        return reply.status(202).send({ runId, status: "PENDING" });
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );
}
