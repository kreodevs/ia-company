import type { FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";

export async function logAudit(
  request: FastifyRequest,
  action: string,
  metadata?: Record<string, unknown>,
) {
  const session = request.session;
  if (!session) return;

  await prisma.auditLog.create({
    data: {
      actorKind: session.kind,
      actorId: session.sub,
      actorEmail: session.email,
      action,
      tenantId: request.effectiveTenantId ?? session.tenantId,
      metadata: metadata as object | undefined,
      ipAddress: request.ip,
    },
  });
}
