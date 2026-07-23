import { warmPlatformSettingsCache } from "../lib/platform-settings.js";
import { tickOrchestrationSchedules } from "../lib/orchestration-plan.js";
import { getPlatformSettingsSync, ensurePlatformSettings } from "../lib/platform-settings.js";

export function startAutonomousScheduler(): NodeJS.Timeout {
  const tickMs = getPlatformSettingsSync().schedulerTickMs;
  return setInterval(() => {
    void tickSchedules();
  }, tickMs);
}

async function tickSchedules() {
  await warmPlatformSettingsCache();
  await tickOrchestrationSchedules();
}

export async function bootstrapScheduler(): Promise<NodeJS.Timeout> {
  await ensurePlatformSettings();
  await warmPlatformSettingsCache();
  return startAutonomousScheduler();
}
