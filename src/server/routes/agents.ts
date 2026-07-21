import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";
import type { CreateAgentInput, UpdateAgentInput } from "../../types/index.js";

export async function agentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.get("/agents", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      return prisma.agent.findMany({
        where: { tenantId },
        include: { skills: { include: { skill: true } } },
        orderBy: { name: "asc" },
      });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { id: string } }>("/agents/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const agent = await prisma.agent.findFirst({
        where: { id: request.params.id, tenantId },
        include: { skills: { include: { skill: true } } },
      });
      if (!agent) return reply.status(404).send({ error: "Agent not found" });
      return agent;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Body: CreateAgentInput }>("/agents", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { skillIds, tenantId: _ignored, ...data } = request.body;

      const agent = await prisma.agent.create({
        data: {
          ...data,
          tenantId,
          skills: skillIds?.length
            ? { create: skillIds.map((skillId) => ({ skillId })) }
            : undefined,
        },
        include: { skills: { include: { skill: true } } },
      });

      return reply.status(201).send(agent);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{ Params: { id: string }; Body: UpdateAgentInput }>(
    "/agents/:id",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const { skillIds, tenantId: _ignored, ...data } = request.body;

        const existing = await prisma.agent.findFirst({
          where: { id: request.params.id, tenantId },
        });
        if (!existing) return reply.status(404).send({ error: "Agent not found" });

        if (skillIds) {
          await prisma.agentSkill.deleteMany({ where: { agentId: request.params.id } });
          if (skillIds.length > 0) {
            await prisma.agentSkill.createMany({
              data: skillIds.map((skillId) => ({
                agentId: request.params.id,
                skillId,
              })),
            });
          }
        }

        const agent = await prisma.agent.update({
          where: { id: request.params.id },
          data,
          include: { skills: { include: { skill: true } } },
        });

        return agent;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.delete<{ Params: { id: string } }>("/agents/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const existing = await prisma.agent.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!existing) return reply.status(404).send({ error: "Agent not found" });
      await prisma.agent.delete({ where: { id: request.params.id } });
      return reply.status(204).send();
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
