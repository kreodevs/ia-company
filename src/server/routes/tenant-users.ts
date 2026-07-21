import type { FastifyInstance } from "fastify";
import type { TenantUserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { hashPassword } from "../../lib/auth.js";
import { handleRouteError, HttpError, requireImpersonatedTenant } from "../lib/request-context.js";

export async function tenantUserRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.get("/tenant/users", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      return prisma.tenantUser.findMany({
        where: { tenantId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Body: { email: string; name: string; password: string; role?: TenantUserRole } }>(
    "/tenant/users",
    { preHandler: [app.requireTenantAdmin] },
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const { email, name, password, role = "member" } = request.body;

        if (!email?.trim() || !name?.trim() || !password || password.length < 8) {
          throw new HttpError(400, "Email, name, and password (min 8 chars) are required");
        }

        if (role === "owner") {
          throw new HttpError(400, "Cannot create additional owners via API");
        }

        const user = await prisma.tenantUser.create({
          data: {
            tenantId,
            email: email.trim().toLowerCase(),
            name: name.trim(),
            passwordHash: await hashPassword(password),
            role,
          },
          select: { id: true, email: true, name: true, role: true, isActive: true },
        });

        return reply.status(201).send(user);
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.put<{ Params: { id: string }; Body: { role?: TenantUserRole; isActive?: boolean } }>(
    "/tenant/users/:id",
    { preHandler: [app.requireTenantAdmin] },
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const existing = await prisma.tenantUser.findFirst({
          where: { id: request.params.id, tenantId },
        });
        if (!existing) {
          return reply.status(404).send({ error: "User not found" });
        }
        if (existing.role === "owner" && request.body.role && request.body.role !== "owner") {
          throw new HttpError(400, "Cannot demote the organization owner");
        }

        const user = await prisma.tenantUser.update({
          where: { id: request.params.id },
          data: request.body,
          select: { id: true, email: true, name: true, role: true, isActive: true },
        });
        return user;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/tenant/users/:id",
    { preHandler: [app.requireTenantAdmin] },
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const existing = await prisma.tenantUser.findFirst({
          where: { id: request.params.id, tenantId },
        });
        if (!existing) {
          return reply.status(404).send({ error: "User not found" });
        }
        if (existing.role === "owner") {
          throw new HttpError(400, "Cannot delete the organization owner");
        }
        await prisma.tenantUser.delete({ where: { id: request.params.id } });
        return reply.status(204).send();
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );
}
