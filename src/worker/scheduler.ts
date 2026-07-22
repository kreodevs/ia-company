import { prisma } from "../lib/prisma.js";
import { executeMetaScheduleRun } from "../core/meta-orchestrator.js";
import { executeWorkflowInBackground } from "../core/engine.js";
import { getPlatformSettingsSync, warmPlatformSettingsCache } from "../lib/platform-settings.js";

export function startAutonomousScheduler(): NodeJS.Timeout {
  const tickMs = getPlatformSettingsSync().schedulerTickMs;
  return setInterval(() => {
    void tickSchedules();
  }, tickMs);
}

async function tickSchedules() {
  await warmPlatformSettingsCache();

  const now = new Date();
  const due = await prisma.autonomousSchedule.findMany({
    where: {
      enabled: true,
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
    },
    take: 10,
  });

  for (const schedule of due) {
    try {
      const { assertTenantCanExecute } = await import("../lib/usage-limits.js");
      await assertTenantCanExecute(schedule.tenantId);

      let runId: string;
      if (schedule.scheduleKind === "meta") {
        runId = await executeMetaScheduleRun(schedule.tenantId);
      } else {
        if (!schedule.workflowId) {
          console.warn(`Schedule ${schedule.id} missing workflowId`);
          continue;
        }
        runId = await executeWorkflowInBackground(schedule.workflowId, {
          tenantId: schedule.tenantId,
          mergeConsensus: true,
          syncConsensus: true,
        });
      }

      const nextRunAt = new Date(Date.now() + schedule.intervalSec * 1000);
      await prisma.autonomousSchedule.update({
        where: { id: schedule.id },
        data: { lastRunAt: now, nextRunAt },
      });

      console.log(`Scheduled run ${runId} for schedule ${schedule.name} (${schedule.scheduleKind})`);
    } catch (err) {
      console.error(`Schedule ${schedule.id} failed:`, err);
    }
  }
}

export async function bootstrapScheduler(): Promise<NodeJS.Timeout> {
  const { ensurePlatformSettings } = await import("../lib/platform-settings.js");
  await ensurePlatformSettings();
  await warmPlatformSettingsCache();
  return startAutonomousScheduler();
}
