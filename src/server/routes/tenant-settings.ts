import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { logAudit } from "../../lib/audit.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";

export async function tenantSettingsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);
  app.addHook("preHandler", app.requireTenantAdmin);

  app.get("/tenant/settings/llm", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const config = await prisma.tenantLlmConfig.findUnique({ where: { tenantId } });
      return config ?? { tenantId, provider: null, baseUrl: null, defaultModel: null, maxCostUsdPerRun: null };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{
    Body: {
      provider?: string;
      apiKey?: string;
      baseUrl?: string;
      defaultModel?: string;
      maxCostUsdPerRun?: number;
    };
  }>("/tenant/settings/llm", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { provider, apiKey, baseUrl, defaultModel, maxCostUsdPerRun } = request.body;

      const config = await prisma.tenantLlmConfig.upsert({
        where: { tenantId },
        update: {
          provider: provider as never,
          apiKey,
          baseUrl,
          defaultModel,
          maxCostUsdPerRun,
        },
        create: {
          tenantId,
          provider: provider as never,
          apiKey,
          baseUrl,
          defaultModel,
          maxCostUsdPerRun,
        },
      });

      await logAudit(request, "tenant.llm_config.update", { provider, defaultModel });
      return { ...config, apiKey: config.apiKey ? "••••••••" : null };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
