import "dotenv/config";
import { startWorkflowWorker } from "./processor.js";
import { bootstrapScheduler } from "./scheduler.js";
import { ensurePlatformSettings, warmPlatformSettingsCache, syncAgentsToPlatformLlmSettings } from "../lib/platform-settings.js";

async function main() {
  await ensurePlatformSettings();
  await warmPlatformSettingsCache();
  const syncedAgents = await syncAgentsToPlatformLlmSettings();
  if (syncedAgents > 0) {
    console.log(`Synced ${syncedAgents} agent(s) to platform LLM settings`);
  }

  const worker = startWorkflowWorker();
  const scheduler = await bootstrapScheduler();

  console.log("Workflow worker + autonomous scheduler started");

  async function shutdown() {
    clearInterval(scheduler);
    await worker.close();
    process.exit(0);
  }

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
