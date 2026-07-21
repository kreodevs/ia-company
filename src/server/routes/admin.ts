import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { hashPassword } from "../../lib/auth.js";
import { clonePlatformTemplatesToTenant } from "../lib/clone-templates.js";
import { handleRouteError, HttpError } from "../lib/request-context.js";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireSuperAdmin);

  app.get("/admin/dashboard", async (request, reply) => {
    try {
      const [tenantCount, agentCount, workflowCount, runCount, recentRuns, tenants] =
        await Promise.all([
          prisma.tenant.count(),
          prisma.agent.count({ where: { tenantId: { not: null } } }),
          prisma.workflow.count({ where: { tenantId: { not: null } } }),
          prisma.executionRun.count(),
          prisma.executionRun.findMany({
            take: 10,
            orderBy: { createdAt: "desc" },
            include: {
              workflow: { select: { name: true } },
              tenant: { select: { name: true, slug: true } },
            },
          }),
          prisma.tenant.findMany({
            orderBy: { createdAt: "desc" },
            include: {
              _count: {
                select: { agents: true, workflows: true, runs: true, users: true },
              },
            },
          }),
        ]);

      const platformTemplates = {
        agents: await prisma.agent.count({ where: { tenantId: null } }),
        skills: await prisma.skill.count({ where: { tenantId: null } }),
        workflows: await prisma.workflow.count({ where: { tenantId: null } }),
      };

      return {
        superAdmin: {
          id: request.session!.sub,
          email: request.session!.email,
          name: request.session!.name,
        },
        impersonatedTenantId: request.session!.impersonatedTenantId,
        stats: {
          tenants: tenantCount,
          tenantAgents: agentCount,
          tenantWorkflows: workflowCount,
          runs: runCount,
          platformTemplates,
        },
        tenants,
        recentRuns,
      };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get("/admin/tenants", async (_request, reply) => {
    try {
      return prisma.tenant.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: { select: { agents: true, workflows: true, runs: true, users: true } },
        },
      });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{
    Body: {
      name: string;
      slug?: string;
      cloneTemplates?: boolean;
      ownerEmail?: string;
      ownerName?: string;
      ownerPassword?: string;
    };
  }>("/admin/tenants", async (request, reply) => {
    try {
      const {
        name,
        slug: rawSlug,
        cloneTemplates = true,
        ownerEmail,
        ownerName,
        ownerPassword,
      } = request.body;

      if (!name?.trim()) {
        throw new HttpError(400, "Tenant name is required");
      }

      const slug = slugify(rawSlug ?? name);
      if (!slug) {
        throw new HttpError(400, "Invalid tenant slug");
      }

      const existing = await prisma.tenant.findUnique({ where: { slug } });
      if (existing) {
        throw new HttpError(409, "Tenant slug already exists");
      }

      const tenant = await prisma.tenant.create({
        data: { name: name.trim(), slug },
      });

      const cloned = cloneTemplates
        ? await clonePlatformTemplatesToTenant(tenant.id)
        : { skills: 0, agents: 0, workflows: 0 };

      let owner = null;
      if (ownerEmail?.trim() && ownerName?.trim() && ownerPassword) {
        if (ownerPassword.length < 8) {
          throw new HttpError(400, "Owner password must be at least 8 characters");
        }
        owner = await prisma.tenantUser.create({
          data: {
            tenantId: tenant.id,
            email: ownerEmail.trim().toLowerCase(),
            name: ownerName.trim(),
            passwordHash: await hashPassword(ownerPassword),
            role: "owner",
          },
          select: { id: true, email: true, name: true, role: true },
        });
      }

      return reply.status(201).send({ tenant, cloned, owner });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.delete<{ Params: { id: string } }>("/admin/tenants/:id", async (request, reply) => {
    try {
      await prisma.tenant.delete({ where: { id: request.params.id } });

      if (request.session?.impersonatedTenantId === request.params.id) {
        const payload = {
          ...request.session,
          impersonatedTenantId: null,
        };
        const token = app.jwt.sign(payload, {
          expiresIn: Number(process.env.SESSION_MAX_AGE_SEC ?? 604800),
        });
        reply.setCookie(process.env.SESSION_COOKIE_NAME ?? "ac_session", token, {
          httpOnly: true,
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }

      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: "Tenant not found" });
    }
  });
}
