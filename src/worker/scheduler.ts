import { prisma } from "../lib/prisma.js";
import { executeWorkflowInBackground } from "../core/engine.js";

const TICK_MS = Number(process.env.SCHEDULER_TICK_MS ?? 60_000);

export function startAutonomousScheduler(): NodeJS.Timeout {
  return setInterval(() => {
    void tickSchedules();
  }, TICK_MS);
}

async function tickSchedules() {
  const now = new Date();
  const due = await prisma.autonomousSchedule.findMany({
    where: {
      enabled: true,
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
    },
    take: 10,
  });

  for (const schedule of due) {
    const runId = await executeWorkflowInBackground(schedule.workflowId, {
      tenantId: schedule.tenantId,
      mergeConsensus: true,
      syncConsensus: true,
    });

    const nextRunAt = new Date(Date.now() + schedule.intervalSec * 1000);
    await prisma.autonomousSchedule.update({
      where: { id: schedule.id },
      data: { lastRunAt: now, nextRunAt },
    });

    console.log(`Scheduled run ${runId} for schedule ${schedule.name}`);
  }
}
