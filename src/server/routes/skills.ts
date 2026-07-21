import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";
import type { CreateSkillInput } from "../../types/index.js";

export async function skillRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.get("/skills", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      return prisma.skill.findMany({
        where: { tenantId },
        orderBy: { name: "asc" },
      });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { id: string } }>("/skills/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const skill = await prisma.skill.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!skill) return reply.status(404).send({ error: "Skill not found" });
      return skill;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Body: CreateSkillInput }>("/skills", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { tenantId: _ignored, ...data } = request.body;
      const skill = await prisma.skill.create({ data: { ...data, tenantId } });
      return reply.status(201).send(skill);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{ Params: { id: string }; Body: Partial<CreateSkillInput> }>(
    "/skills/:id",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const existing = await prisma.skill.findFirst({
          where: { id: request.params.id, tenantId },
        });
        if (!existing) return reply.status(404).send({ error: "Skill not found" });

        const { tenantId: _ignored, ...data } = request.body;
        const skill = await prisma.skill.update({
          where: { id: request.params.id },
          data,
        });
        return skill;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.delete<{ Params: { id: string } }>("/skills/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const existing = await prisma.skill.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!existing) return reply.status(404).send({ error: "Skill not found" });
      await prisma.skill.delete({ where: { id: request.params.id } });
      return reply.status(204).send();
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
