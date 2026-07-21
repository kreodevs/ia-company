import type { FastifyReply, FastifyRequest } from "fastify";
import type { SessionPayload } from "../../lib/auth.js";
import { isSuperAdmin, isTenantAdmin } from "../../lib/auth.js";

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

declare module "fastify" {
  interface FastifyRequest {
    session: SessionPayload | null;
    effectiveTenantId: string | null;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireSuperAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireTenantContext: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireTenantAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export function requireSession(request: FastifyRequest): SessionPayload {
  if (!request.session) {
    throw new HttpError(401, "Authentication required");
  }
  return request.session;
}

export function assertSuperAdmin(request: FastifyRequest): SessionPayload {
  const session = requireSession(request);
  if (!isSuperAdmin(session)) {
    throw new HttpError(403, "Superadmin access required");
  }
  return session;
}

export function assertTenantAdmin(request: FastifyRequest): SessionPayload {
  const session = requireSession(request);
  if (!isTenantAdmin(session)) {
    throw new HttpError(403, "Tenant admin access required");
  }
  return session;
}

export function requireImpersonatedTenant(request: FastifyRequest): string {
  const tenantId = request.effectiveTenantId;
  if (!tenantId) {
    throw new HttpError(
      403,
      request.session?.kind === "superadmin"
        ? "Select a tenant to impersonate before accessing tenant resources"
        : "Tenant context required",
    );
  }
  return tenantId;
}

export function handleRouteError(reply: FastifyReply, err: unknown) {
  if (err instanceof HttpError) {
    return reply.status(err.statusCode).send({ error: err.message });
  }
  throw err;
}
