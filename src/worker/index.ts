import "dotenv/config";
import { startWorkflowWorker } from "./processor.js";
import { startAutonomousScheduler } from "./scheduler.js";

const worker = startWorkflowWorker();
const scheduler = startAutonomousScheduler();

console.log("Workflow worker + autonomous scheduler started");

async function shutdown() {
  clearInterval(scheduler);
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
