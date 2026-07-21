import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { executeWorkflowInBackground } from "../../core/engine.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";
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

        await prisma.$transaction(async (tx) => {
          await tx.workflow.update({ where: { id: workflowId }, data });

          if (!steps) return;

          const incomingIds = steps
            .map((s) => s.id)
            .filter((id): id is string => Boolean(id && !id.startsWith("temp-")));

          if (incomingIds.length > 0) {
            await tx.workflowStep.deleteMany({
              where: { workflowId, id: { notIn: incomingIds } },
            });
          } else {
            await tx.workflowStep.deleteMany({ where: { workflowId } });
          }

          const idMap = new Map<string, string>();

          for (let i = 0; i < steps.length; i++) {
            const s = steps[i];
            const stepData = {
              agentId: s.agentId,
              stepOrder: s.stepOrder ?? i,
              label: s.label,
              positionX: s.positionX ?? 250,
              positionY: s.positionY ?? i * 150,
              inputConfig: (s.inputConfig ?? {}) as object,
              outputConfig: (s.outputConfig ?? {}) as object,
            };

            if (s.id && !s.id.startsWith("temp-")) {
              const updated = await tx.workflowStep.update({
                where: { id: s.id },
                data: stepData,
              });
              idMap.set(s.id, updated.id);
            } else {
              const created = await tx.workflowStep.create({
                data: { workflowId, ...stepData },
              });
              if (s.id) idMap.set(s.id, created.id);
            }
          }

          if (edges) {
            await tx.workflowEdge.deleteMany({ where: { workflowId } });
            await tx.workflowEdge.createMany({
              data: edges.map((e) => ({
                workflowId,
                sourceStepId: idMap.get(e.sourceStepId) ?? e.sourceStepId,
                targetStepId: idMap.get(e.targetStepId) ?? e.targetStepId,
                sourceHandle: e.sourceHandle,
                targetHandle: e.targetHandle,
              })),
            });
          }
        });

        const workflow = await prisma.workflow.findUnique({
          where: { id: workflowId },
          include: {
            steps: { include: { agent: true }, orderBy: { stepOrder: "asc" } },
            edges: true,
          },
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
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const workflow = await prisma.workflow.findFirst({
          where: { id: request.params.id, tenantId },
        });
        if (!workflow) return reply.status(404).send({ error: "Workflow not found" });

        const runId = await executeWorkflowInBackground(request.params.id, {
          ...request.body,
          tenantId,
        });
        return reply.status(202).send({ runId, status: "PENDING" });
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );
}
