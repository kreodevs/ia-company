import "dotenv/config";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { agentRoutes } from "./routes/agents.js";
import { adminRoutes } from "./routes/admin.js";
import { consensusRoutes } from "./routes/consensus.js";
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
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? true,
    credentials: true,
  });

  await app.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: "1 minute",
  });

  await app.register(async (instance) => {
    await registerAuthPlugin(instance);
  }, { prefix: "/api" });

  app.get("/api/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  await app.register(adminRoutes, { prefix: "/api" });
  await app.register(tenantUserRoutes, { prefix: "/api" });
  await app.register(tenantSettingsRoutes, { prefix: "/api" });
  await app.register(consensusRoutes, { prefix: "/api" });
  await app.register(scheduleRoutes, { prefix: "/api" });
  await app.register(agentRoutes, { prefix: "/api" });
  await app.register(skillRoutes, { prefix: "/api" });
  await app.register(workflowRoutes, { prefix: "/api" });
  await app.register(runRoutes, { prefix: "/api" });

  return app;
}

async function main() {
  const app = await buildServer();
  await app.listen({ port: PORT, host: HOST });
  console.log(`Auto-Company API listening on http://${HOST}:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export { buildServer };
