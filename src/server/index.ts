import "dotenv/config";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { agentRoutes } from "./routes/agents.js";
import { adminRoutes } from "./routes/admin.js";
import { consensusRoutes } from "./routes/consensus.js";
import { platformTemplateRoutes } from "./routes/platform-templates.js";
import { platformSettingsRoutes } from "./routes/platform-settings.js";
import {
  ensurePlatformSettings,
  getPlatformSettingsSync,
  warmPlatformSettingsCache,
} from "../lib/platform-settings.js";
import { runRoutes } from "./routes/runs.js";
import { scheduleRoutes } from "./routes/schedules.js";
import { skillRoutes } from "./routes/skills.js";
import { tenantSettingsRoutes } from "./routes/tenant-settings.js";
import { tenantUserRoutes } from "./routes/tenant-users.js";
import { workflowRoutes } from "./routes/workflows.js";
import { registerAuthPlugin } from "./plugins/auth.js";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";

async function buildServer() {
  try {
    await ensurePlatformSettings();
    await warmPlatformSettingsCache();
  } catch (err) {
    console.warn("Platform settings DB unavailable, using defaults:", err);
  }
  const platformSettings = getPlatformSettingsSync();

  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? platformSettings.publicUrl ?? true,
    credentials: true,
  });

  await app.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: "1 minute",
  });

  await app.register(async (api) => {
    await registerAuthPlugin(api);

    api.get("/health", async () => ({
      status: "ok",
      timestamp: new Date().toISOString(),
    }));

    await api.register(adminRoutes);
    await api.register(platformSettingsRoutes);
    await api.register(platformTemplateRoutes);
    await api.register(tenantUserRoutes);
    await api.register(tenantSettingsRoutes);
    await api.register(consensusRoutes);
    await api.register(scheduleRoutes);
    await api.register(agentRoutes);
    await api.register(skillRoutes);
    await api.register(workflowRoutes);
    await api.register(runRoutes);
  }, { prefix: "/api" });

  return app;
}

async function main() {
  const app = await buildServer();
  app.log.level = "info";
  await app.listen({ port: PORT, host: HOST });
  console.log(`Auto-Company API listening on http://${HOST}:${PORT}`);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { buildServer };
