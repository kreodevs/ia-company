import type { FastifyInstance } from "fastify";
import { logAudit } from "../../lib/audit.js";
import {
  ensurePlatformSettings,
  getPlatformSettings,
  toPublicPlatformSettings,
  updatePlatformSettings,
  type PlatformSettingsUpdateInput,
} from "../../lib/platform-settings.js";
import { handleRouteError } from "../lib/request-context.js";

export async function platformSettingsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireSuperAdmin);

  app.get("/admin/settings/platform", async (_request, reply) => {
    try {
      const row = await ensurePlatformSettings();
      return toPublicPlatformSettings(row);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{ Body: PlatformSettingsUpdateInput }>(
    "/admin/settings/platform",
    async (request, reply) => {
      try {
        const updated = await updatePlatformSettings(request.body);
        await logAudit(request, "platform.settings.update", { fields: Object.keys(request.body) });
        return updated;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get("/admin/settings/platform/resolved", async (_request, reply) => {
    try {
      const settings = await getPlatformSettings();
      return {
        publicUrl: settings.publicUrl,
        defaultProvider: settings.defaultProvider,
        defaultModel: settings.defaultModel,
        defaultTemperature: settings.defaultTemperature,
        executeRateLimitMax: settings.executeRateLimitMax,
        authRateLimitMax: settings.authRateLimitMax,
        shellTimeoutMs: settings.shellTimeoutMs,
        schedulerTickMs: settings.schedulerTickMs,
        emailFrom: settings.emailFrom,
        providersConfigured: {
          tokenlab: Boolean(settings.providers.tokenlab.apiKey),
          openrouter: Boolean(settings.providers.openrouter.apiKey),
          custom: Boolean(settings.providers.custom.apiKey),
          resend: Boolean(settings.resendApiKey),
          github: Boolean(settings.githubApiKey),
        },
      };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
