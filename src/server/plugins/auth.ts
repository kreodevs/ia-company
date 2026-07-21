import type { FastifyInstance, FastifyReply } from "fastify";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { prisma } from "../../lib/prisma.js";
import { logAudit } from "../../lib/audit.js";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  hashPassword,
  resolveEffectiveTenantId,
  sessionCookieOptions,
  verifyPassword,
  type SessionPayload,
} from "../../lib/auth.js";

export async function registerAuthPlugin(app: FastifyInstance) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  await app.register(cookie);
  await app.register(rateLimit, {
    max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 30),
    timeWindow: "1 minute",
  });
  await app.register(jwt, {
    secret,
    cookie: {
      cookieName: SESSION_COOKIE,
      signed: false,
    },
  });

  app.decorateRequest("session", null);
  app.decorateRequest("effectiveTenantId", null);

  app.addHook("onRequest", async (request) => {
    request.session = null;
    request.effectiveTenantId = null;

    try {
      const payload = await request.jwtVerify<SessionPayload>();
      request.session = payload;
      request.effectiveTenantId = resolveEffectiveTenantId(payload);
    } catch {
      // unauthenticated
    }
  });

  app.decorate("authenticate", async (request, reply) => {
    if (!request.session) {
      return reply.status(401).send({ error: "Authentication required" });
    }
  });

  app.decorate("requireSuperAdmin", async (request, reply) => {
    if (!request.session) {
      return reply.status(401).send({ error: "Authentication required" });
    }
    if (request.session.kind !== "superadmin") {
      return reply.status(403).send({ error: "Superadmin access required" });
    }
  });

  app.decorate("requireTenantContext", async (request, reply) => {
    if (!request.session) {
      return reply.status(401).send({ error: "Authentication required" });
    }
    if (!request.effectiveTenantId) {
      return reply.status(403).send({
        error:
          request.session.kind === "superadmin"
            ? "Select a tenant to impersonate before accessing tenant resources"
            : "Tenant context required",
      });
    }
  });

  app.decorate("requireTenantAdmin", async (request, reply) => {
    if (!request.session) {
      return reply.status(401).send({ error: "Authentication required" });
    }

    if (request.session.kind === "superadmin") {
      if (!request.effectiveTenantId) {
        return reply.status(403).send({ error: "Select a tenant to impersonate" });
      }
      return;
    }

    const role = request.session.tenantRole;
    if (role !== "owner" && role !== "admin") {
      return reply.status(403).send({ error: "Tenant admin access required" });
    }
  });

  async function signSession(reply: FastifyReply, payload: SessionPayload) {
    const token = app.jwt.sign(payload, { expiresIn: SESSION_MAX_AGE });
    const secure = process.env.NODE_ENV === "production";
    reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions(secure));
    return token;
  }

  async function tenantSummary(tenantId: string | null) {
    if (!tenantId) return null;
    return prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true },
    });
  }

  app.get("/auth/status", async (request) => {
    const superAdminCount = await prisma.superAdmin.count();
    const needsSetup = superAdminCount === 0;

    if (!request.session) {
      return { needsSetup, authenticated: false };
    }

    const session = request.session;
    const effectiveTenantId = resolveEffectiveTenantId(session);
    const activeTenant = await tenantSummary(effectiveTenantId);

    if (session.kind === "tenant") {
      return {
        needsSetup,
        authenticated: true,
        kind: "tenant" as const,
        tenantUser: {
          id: session.sub,
          email: session.email,
          name: session.name,
          role: session.tenantRole,
        },
        tenant: activeTenant,
      };
    }

    return {
      needsSetup,
      authenticated: true,
      kind: "superadmin" as const,
      superAdmin: {
        id: session.sub,
        email: session.email,
        name: session.name,
      },
      impersonatedTenant: activeTenant,
    };
  });

  app.post<{ Body: { email: string; name: string; password: string } }>(
    "/auth/setup",
    async (request, reply) => {
      const count = await prisma.superAdmin.count();
      if (count > 0) {
        return reply.status(403).send({ error: "Superadmin already exists" });
      }

      const { email, name, password } = request.body;
      if (!email?.trim() || !name?.trim() || !password || password.length < 8) {
        return reply.status(400).send({
          error: "Email, name, and password (min 8 chars) are required",
        });
      }

      const passwordHash = await hashPassword(password);
      const admin = await prisma.superAdmin.create({
        data: {
          email: email.trim().toLowerCase(),
          name: name.trim(),
          passwordHash,
        },
      });

      const payload: SessionPayload = {
        kind: "superadmin",
        sub: admin.id,
        email: admin.email,
        name: admin.name,
        tenantId: null,
        impersonatedTenantId: null,
      };

      await signSession(reply, payload);

      return reply.status(201).send({
        kind: "superadmin",
        superAdmin: { id: admin.id, email: admin.email, name: admin.name },
        impersonatedTenant: null,
      });
    },
  );

  app.post<{ Body: { email: string; password: string } }>(
    "/auth/login",
    async (request, reply) => {
      const { email, password } = request.body;
      if (!email || !password) {
        return reply.status(400).send({ error: "Email and password are required" });
      }

      const admin = await prisma.superAdmin.findUnique({
        where: { email: email.trim().toLowerCase() },
      });

      if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
        await logAudit(request, "auth.login.failed", { kind: "superadmin", email });
        return reply.status(401).send({ error: "Invalid credentials" });
      }

      const payload: SessionPayload = {
        kind: "superadmin",
        sub: admin.id,
        email: admin.email,
        name: admin.name,
        tenantId: null,
        impersonatedTenantId: null,
      };

      await signSession(reply, payload);

      await logAudit(request, "auth.login", { kind: "superadmin" });

      return {
        kind: "superadmin",
        superAdmin: { id: admin.id, email: admin.email, name: admin.name },
        impersonatedTenant: null,
      };
    },
  );

  app.post<{ Body: { tenantSlug: string; email: string; password: string } }>(
    "/auth/tenant/login",
    async (request, reply) => {
      const { tenantSlug, email, password } = request.body;
      if (!tenantSlug?.trim() || !email?.trim() || !password) {
        return reply.status(400).send({
          error: "Organization slug, email, and password are required",
        });
      }

      const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug.trim().toLowerCase() },
      });
      if (!tenant) {
        return reply.status(404).send({ error: "Organization not found" });
      }

      const user = await prisma.tenantUser.findUnique({
        where: {
          tenantId_email: {
            tenantId: tenant.id,
            email: email.trim().toLowerCase(),
          },
        },
      });

      if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
        await logAudit(request, "auth.login.failed", {
          kind: "tenant",
          email,
          tenantSlug: tenant.slug,
        });
        return reply.status(401).send({ error: "Invalid credentials" });
      }

      const payload: SessionPayload = {
        kind: "tenant",
        sub: user.id,
        email: user.email,
        name: user.name,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantRole: user.role,
        impersonatedTenantId: null,
      };

      await signSession(reply, payload);

      request.effectiveTenantId = tenant.id;
      await logAudit(request, "auth.login", { kind: "tenant", tenantId: tenant.id });

      return {
        kind: "tenant",
        tenantUser: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      };
    },
  );

  app.post("/auth/logout", async (request, reply) => {
    await logAudit(request, "auth.logout", { kind: request.session?.kind });
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });

  app.post<{ Body: { tenantSlug: string; email: string } }>(
    "/auth/tenant/forgot-password",
    async (request, reply) => {
      const { tenantSlug, email } = request.body;
      if (!tenantSlug?.trim() || !email?.trim()) {
        return reply.status(400).send({ error: "Organization slug and email are required" });
      }

      const { createPasswordResetToken } = await import("../../lib/password-reset.js");
      await createPasswordResetToken(tenantSlug, email);

      return {
        ok: true,
        message: "If an account exists, a reset link has been sent.",
      };
    },
  );

  app.post<{ Body: { token: string; password: string } }>(
    "/auth/tenant/reset-password",
    async (request, reply) => {
      const { token, password } = request.body;
      if (!token || !password) {
        return reply.status(400).send({ error: "Token and new password are required" });
      }

      try {
        const { resetPasswordWithToken } = await import("../../lib/password-reset.js");
        await resetPasswordWithToken(token, password);
        return { ok: true };
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : "Reset failed",
        });
      }
    },
  );

  app.post<{ Body: { tenantId: string | null } }>(
    "/auth/impersonate",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const { tenantId } = request.body;
      const session = request.session!;

      if (tenantId) {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
          return reply.status(404).send({ error: "Tenant not found" });
        }
      }

      const payload: SessionPayload = {
        ...session,
        impersonatedTenantId: tenantId,
      };

      await signSession(reply, payload);

      await logAudit(request, "auth.impersonate", { tenantId });

      return { impersonatedTenant: await tenantSummary(tenantId) };
    },
  );
}
