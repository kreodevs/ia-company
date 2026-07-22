import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { getPlatformSettings } from "../../lib/platform-settings.js";
import { logAudit } from "../../lib/audit.js";
import { INTEREST_CATEGORIES, listTenantInterests, setTenantInterests } from "../../lib/tenant-interests.js";
import { getTenantMonthlyUsage } from "../../lib/usage-limits.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";

export async function tenantSettingsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);
  app.addHook("preHandler", app.requireTenantAdmin);

  app.get("/tenant/settings/llm", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const [config, platform] = await Promise.all([
        prisma.tenantLlmConfig.findUnique({ where: { tenantId } }),
        getPlatformSettings(),
      ]);

      const activeProvider = platform.defaultProvider;
      const platformConfigured = Boolean(platform.providers[activeProvider]?.apiKey);

      return {
        tenantId,
        platformProvider: activeProvider,
        platformModel: platform.defaultModel,
        platformConfigured,
        defaultModel: config?.defaultModel ?? null,
        maxCostUsdPerRun: config?.maxCostUsdPerRun ?? null,
      };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{
    Body: {
      defaultModel?: string | null;
      maxCostUsdPerRun?: number | null;
    };
  }>("/tenant/settings/llm", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { defaultModel, maxCostUsdPerRun } = request.body;

      const config = await prisma.tenantLlmConfig.upsert({
        where: { tenantId },
        update: {
          defaultModel,
          maxCostUsdPerRun,
          provider: null,
          apiKey: null,
          baseUrl: null,
        },
        create: {
          tenantId,
          defaultModel,
          maxCostUsdPerRun,
        },
      });

      const platform = await getPlatformSettings();

      await logAudit(request, "tenant.llm_config.update", { defaultModel, maxCostUsdPerRun });
      return {
        tenantId: config.tenantId,
        platformProvider: platform.defaultProvider,
        platformModel: platform.defaultModel,
        platformConfigured: Boolean(platform.providers[platform.defaultProvider]?.apiKey),
        defaultModel: config.defaultModel,
        maxCostUsdPerRun: config.maxCostUsdPerRun,
      };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get("/tenant/settings/notifications", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const config = await prisma.tenantNotificationConfig.findUnique({ where: { tenantId } });
      return (
        config ?? {
          tenantId,
          webhookUrl: null,
          slackWebhookUrl: null,
          emailRecipients: null,
          notifyOnComplete: true,
          notifyOnFail: true,
        }
      );
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{
    Body: {
      webhookUrl?: string | null;
      slackWebhookUrl?: string | null;
      emailRecipients?: string | null;
      notifyOnComplete?: boolean;
      notifyOnFail?: boolean;
    };
  }>("/tenant/settings/notifications", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const config = await prisma.tenantNotificationConfig.upsert({
        where: { tenantId },
        update: request.body,
        create: { tenantId, ...request.body },
      });
      await logAudit(request, "tenant.notifications.update", { tenantId });
      return config;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get("/tenant/settings/usage", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      return getTenantMonthlyUsage(tenantId);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get("/tenant/settings/limits", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const limits = await prisma.tenantUsageLimits.findUnique({ where: { tenantId } });
      return (
        limits ?? {
          tenantId,
          maxRunsPerMonth: null,
          maxCostUsdPerMonth: null,
          maxTokensPerMonth: null,
        }
      );
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{
    Body: {
      maxRunsPerMonth?: number | null;
      maxCostUsdPerMonth?: number | null;
      maxTokensPerMonth?: number | null;
    };
  }>("/tenant/settings/limits", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const limits = await prisma.tenantUsageLimits.upsert({
        where: { tenantId },
        update: request.body,
        create: { tenantId, ...request.body },
      });
      await logAudit(request, "tenant.usage_limits.update", request.body);
      return limits;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get("/tenant/interests", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const selected = await listTenantInterests(tenantId);
      return {
        categories: INTEREST_CATEGORIES,
        selected: selected.map((s) => s.category),
      };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{ Body: { categories: string[] } }>(
    "/tenant/interests",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const categories = Array.isArray(request.body?.categories) ? request.body.categories : [];
        await setTenantInterests(tenantId, categories);
        await logAudit(request, "tenant.interests.update", { count: categories.length });
        return { selected: categories };
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get("/tenant/settings/opencode", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { getTenantOpencodeConfigPublic } = await import("../../lib/tenant-opencode.js");
      return getTenantOpencodeConfigPublic(tenantId);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{
    Body: {
      enabled?: boolean;
      baseUrl?: string | null;
      username?: string | null;
      password?: string | null;
      defaultAgent?: string | null;
      defaultModel?: string | null;
      projectPath?: string | null;
      pollIntervalMs?: number;
      maxWaitMs?: number;
      autoApprovePermissions?: boolean;
    };
  }>("/tenant/settings/opencode", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { upsertTenantOpencodeConfig } = await import("../../lib/tenant-opencode.js");
      const config = await upsertTenantOpencodeConfig(tenantId, request.body);
      await logAudit(request, "tenant.opencode_config.update", { enabled: request.body.enabled });
      return config;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post("/tenant/settings/opencode/test", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { testTenantOpencodeConnection } = await import("../../lib/tenant-opencode.js");
      return testTenantOpencodeConnection(tenantId);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
