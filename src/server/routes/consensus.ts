import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { logAudit } from "../../lib/audit.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";

export async function consensusRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.get("/consensus", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const record = await prisma.tenantConsensus.findUnique({ where: { tenantId } });
      return (
        record ?? {
          tenantId,
          content: "# Consensus\n\nNo consensus document yet.",
          nextAction: null,
        }
      );
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{ Body: { content: string; nextAction?: string } }>(
    "/consensus",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const { content, nextAction } = request.body;

        const record = await prisma.tenantConsensus.upsert({
          where: { tenantId },
          update: { content, nextAction },
          create: { tenantId, content, nextAction },
        });

        await logAudit(request, "consensus.update", { nextAction });
        return record;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );
}
