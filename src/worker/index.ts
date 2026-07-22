import "dotenv/config";
import { startWorkflowWorker } from "./processor.js";
import { startOpencodeWorker } from "./opencode-processor.js";
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
  const opencodeWorker = startOpencodeWorker();
  const scheduler = await bootstrapScheduler();

  console.log("Workflow worker + OpenCode worker + autonomous scheduler started");

  async function shutdown() {
    clearInterval(scheduler);
    await worker.close();
    await opencodeWorker.close();
    process.exit(0);
  }

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
