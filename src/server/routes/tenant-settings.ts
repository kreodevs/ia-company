import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { encryptSecret, maskSecret } from "../../lib/crypto.js";
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
      if (!config) {
        return {
          tenantId,
          provider: null,
          baseUrl: null,
          defaultModel: null,
          maxCostUsdPerRun: null,
          apiKey: null,
        };
      }
      return {
        ...config,
        apiKey: maskSecret(config.apiKey),
      };
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

      const existing = await prisma.tenantLlmConfig.findUnique({ where: { tenantId } });
      const nextApiKey =
        apiKey && apiKey !== "••••••••"
          ? encryptSecret(apiKey)
          : existing?.apiKey;

      const config = await prisma.tenantLlmConfig.upsert({
        where: { tenantId },
        update: {
          provider: provider as never,
          apiKey: nextApiKey,
          baseUrl,
          defaultModel,
          maxCostUsdPerRun,
        },
        create: {
          tenantId,
          provider: provider as never,
          apiKey: apiKey ? encryptSecret(apiKey) : undefined,
          baseUrl,
          defaultModel,
          maxCostUsdPerRun,
        },
      });

      await logAudit(request, "tenant.llm_config.update", { provider, defaultModel });
      return { ...config, apiKey: maskSecret(config.apiKey) };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
