import type { FastifyInstance } from "fastify";
import type { AgentProvider } from "@prisma/client";
import { logAudit } from "../../lib/audit.js";
import {
  ensurePlatformSettings,
  getPlatformSettings,
  toPublicPlatformSettings,
  updatePlatformSettings,
  type PlatformSettingsUpdateInput,
} from "../../lib/platform-settings.js";
import { invalidateProviderModelsCache, listProviderModels } from "../../lib/provider-models.js";
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
        invalidateProviderModelsCache();
        await logAudit(request, "platform.settings.update", { fields: Object.keys(request.body) });
        return updated;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.get<{ Querystring: { provider?: AgentProvider; q?: string } }>(
    "/admin/settings/platform/models",
    async (request, reply) => {
      try {
        const provider = request.query.provider;
        if (provider !== "openrouter" && provider !== "tokenlab") {
          return reply.status(400).send({
            error: 'Query parameter "provider" must be "openrouter" or "tokenlab".',
          });
        }
        const models = await listProviderModels(provider, request.query.q);
        return { provider, models };
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
        opencodeEnabled: settings.opencodeEnabled,
      };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post("/admin/settings/platform/llm-test", async (_request, reply) => {
    try {
      const { generateText, tool } = await import("ai");
      const { z } = await import("zod");
      const { createLanguageModel, findApiCallError, formatLlmProviderError } = await import(
        "../../core/providers.js"
      );
      const settings = await getPlatformSettings();
      const providerConfig = {
        provider: settings.defaultProvider,
        model: settings.defaultModel,
        temperature: settings.defaultTemperature,
        apiKey: undefined,
        baseURL: undefined,
      };
      const model = createLanguageModel(providerConfig);

      try {
        const result = await generateText({
          model,
          prompt: "Reply with exactly: LLM OK",
          maxSteps: 2,
          tools: {
            ping: tool({
              description: "Health check tool",
              parameters: z.object({ ok: z.boolean().optional() }),
              execute: async () => "pong",
            }),
          },
        });
        return {
          ok: true,
          provider: settings.defaultProvider,
          model: settings.defaultModel,
          text: result.text.slice(0, 200),
        };
      } catch (err) {
        const apiErr = findApiCallError(err);
        return reply.status(502).send({
          ok: false,
          provider: settings.defaultProvider,
          model: settings.defaultModel,
          error: formatLlmProviderError(err, providerConfig),
          statusCode: apiErr?.statusCode ?? null,
          responseBody: apiErr?.responseBody?.slice(0, 2_000) ?? null,
        });
      }
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
