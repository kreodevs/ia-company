import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { logAudit } from "../../lib/audit.js";
import { seedPlatformTemplates } from "../../lib/seed-platform.js";
import { assertPlatformAgent, updateWorkflowGraph } from "../lib/workflow-graph.js";
import { handleRouteError } from "../lib/request-context.js";
import type { CreateWorkflowInput } from "../../types/index.js";

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
          _count: { select: { steps: true, edges: true } },
        },
        orderBy: { name: "asc" },
      });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get<{ Params: { id: string } }>("/admin/templates/workflows/:id", async (request, reply) => {
    try {
      const workflow = await prisma.workflow.findFirst({
        where: { id: request.params.id, tenantId: null },
        include: {
          steps: {
            include: { agent: { include: { skills: { include: { skill: true } } } } },
            orderBy: { stepOrder: "asc" },
          },
          edges: true,
        },
      });
      if (!workflow) return reply.status(404).send({ error: "Template not found" });
      return workflow;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Body: { name: string; description?: string } }>(
    "/admin/templates/workflows",
    async (request, reply) => {
      try {
        const { name, description } = request.body;
        if (!name?.trim()) {
          return reply.status(400).send({ error: "Workflow name is required" });
        }

        const existing = await prisma.workflow.findFirst({
          where: { tenantId: null, name: name.trim() },
        });
        if (existing) {
          return reply.status(409).send({ error: "Platform workflow name already exists" });
        }

        const workflow = await prisma.workflow.create({
          data: { tenantId: null, name: name.trim(), description },
          include: { steps: { include: { agent: true } }, edges: true },
        });

        await logAudit(request, "platform.workflow.create", { workflowId: workflow.id, name });
        return reply.status(201).send(workflow);
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.put<{ Params: { id: string }; Body: CreateWorkflowInput }>(
    "/admin/templates/workflows/:id",
    async (request, reply) => {
      try {
        const existing = await prisma.workflow.findFirst({
          where: { id: request.params.id, tenantId: null },
        });
        if (!existing) return reply.status(404).send({ error: "Template not found" });

        const { steps, edges, tenantId: _ignored, ...data } = request.body;

        const workflow = await updateWorkflowGraph(
          existing.id,
          { ...data, steps, edges },
          { validateAgentId: assertPlatformAgent },
        );

        await logAudit(request, "platform.workflow.update", { workflowId: existing.id });
        return workflow;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/admin/templates/workflows/:id",
    async (request, reply) => {
      try {
        const existing = await prisma.workflow.findFirst({
          where: { id: request.params.id, tenantId: null },
        });
        if (!existing) return reply.status(404).send({ error: "Template not found" });

        await prisma.workflow.delete({ where: { id: existing.id } });
        await logAudit(request, "platform.workflow.delete", { workflowId: existing.id });
        return reply.status(204).send();
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );
}
