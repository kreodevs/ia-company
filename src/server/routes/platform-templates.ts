import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { logAudit } from "../../lib/audit.js";
import { seedPlatformTemplates } from "../../lib/seed-platform.js";
import { handleRouteError } from "../lib/request-context.js";

const PLATFORM = { tenantId: null } as const;

export async function platformTemplateRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireSuperAdmin);

  app.get("/admin/templates/summary", async (_request, reply) => {
    try {
      const [agents, skills, workflows] = await Promise.all([
        prisma.agent.count({ where: PLATFORM }),
        prisma.skill.count({ where: PLATFORM }),
        prisma.workflow.count({ where: PLATFORM }),
      ]);
      return { agents, skills, workflows };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post("/admin/templates/reseed", async (request, reply) => {
    try {
      const result = await seedPlatformTemplates(prisma);
      await logAudit(request, "platform.templates.reseed", result);
      return result;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get("/admin/templates/agents", async (_request, reply) => {
    try {
      return prisma.agent.findMany({
        where: PLATFORM,
        include: { skills: { include: { skill: true } } },
        orderBy: { name: "asc" },
      });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/admin/templates/agents/:id",
    async (request, reply) => {
      try {
        const existing = await prisma.agent.findFirst({
          where: { id: request.params.id, tenantId: null },
        });
        if (!existing) return reply.status(404).send({ error: "Template not found" });

        const { skillIds, ...data } = request.body as {
          skillIds?: string[];
          name?: string;
          role?: string;
          systemPrompt?: string;
          model?: string;
          provider?: string;
          temperature?: number;
        };

        const agent = await prisma.agent.update({
          where: { id: existing.id },
          data: data as never,
          include: { skills: { include: { skill: true } } },
        });

        if (skillIds) {
          await prisma.agentSkill.deleteMany({ where: { agentId: agent.id } });
          for (const skillId of skillIds) {
            await prisma.agentSkill.create({ data: { agentId: agent.id, skillId } });
          }
        }

        await logAudit(request, "platform.agent.update", { agentId: agent.id });
        return prisma.agent.findUnique({
          where: { id: agent.id },
          include: { skills: { include: { skill: true } } },
        });
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get("/admin/templates/skills", async (_request, reply) => {
    try {
      return prisma.skill.findMany({ where: PLATFORM, orderBy: { name: "asc" } });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/admin/templates/skills/:id",
    async (request, reply) => {
      try {
        const existing = await prisma.skill.findFirst({
          where: { id: request.params.id, tenantId: null },
        });
        if (!existing) return reply.status(404).send({ error: "Template not found" });

        const skill = await prisma.skill.update({
          where: { id: existing.id },
          data: request.body as never,
        });
        await logAudit(request, "platform.skill.update", { skillId: skill.id });
        return skill;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get("/admin/templates/workflows", async (_request, reply) => {
    try {
      return prisma.workflow.findMany({
        where: PLATFORM,
        include: {
          steps: { include: { agent: true }, orderBy: { stepOrder: "asc" } },
          edges: true,
        },
        orderBy: { name: "asc" },
      });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{ Params: { id: string }; Body: { name?: string; description?: string } }>(
    "/admin/templates/workflows/:id",
    async (request, reply) => {
      try {
        const existing = await prisma.workflow.findFirst({
          where: { id: request.params.id, tenantId: null },
        });
        if (!existing) return reply.status(404).send({ error: "Template not found" });

        const workflow = await prisma.workflow.update({
          where: { id: existing.id },
          data: request.body,
        });
        await logAudit(request, "platform.workflow.update", { workflowId: workflow.id });
        return workflow;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );
}
