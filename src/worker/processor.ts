import { Worker } from "bullmq";
import { WorkflowExecutor } from "../core/engine.js";
import { persistAndPublishRunEvent } from "../lib/run-events.js";
import { warmPlatformSettingsCache } from "../lib/platform-settings.js";
import { getRedisConnection } from "../lib/redis.js";
import { withTenantRunLock } from "../lib/tenant-run-lock.js";
import { clearRunCancellation, isRunCancelled } from "./run-control.js";
import { moveWorkflowJobToDeadLetter } from "./dead-letter.js";
import { WORKFLOW_QUEUE, type WorkflowJobData } from "./queue.js";
import { prisma } from "../lib/prisma.js";

async function executeWorkflowJob(
  executor: WorkflowExecutor,
  job: { data: WorkflowJobData; attemptsMade: number },
): Promise<void> {
  const { runId, workflowId, tenantId, initialMemory, mergeConsensus, syncConsensus, productSlug, workflowName } =
    job.data;

  if (isRunCancelled(runId)) {
    await prisma.executionRun.update({
      where: { id: runId },
      data: { status: "CANCELLED", completedAt: new Date() },
    });
    clearRunCancellation(runId);
    return;
  }

  await warmPlatformSettingsCache();

  await executor.runExisting(runId, workflowId, {
    tenantId,
    initialMemory,
    mergeConsensus,
    syncConsensus,
    productSlug,
    workflowName,
    resumeFromStepOrder: job.data.resumeFromStepOrder,
    forceLocalImplementation: job.data.forceLocalImplementation,
    afterOpencodeDelegation: job.data.afterOpencodeDelegation,
  });
  clearRunCancellation(runId);
}

export function startWorkflowWorker(): Worker<WorkflowJobData> {
  const executor = new WorkflowExecutor();

  const worker = new Worker<WorkflowJobData>(
    WORKFLOW_QUEUE,
    async (job) => {
      const run = async () => executeWorkflowJob(executor, job);

      if (job.data.tenantId) {
        await withTenantRunLock(job.data.tenantId, run);
      } else {
        await run();
      }
    },
    { connection: getRedisConnection(), concurrency: 2 },
  );

  worker.on("failed", async (job, err) => {
    if (!job) return;
    console.error(`Workflow job ${job.id} failed (attempt ${job.attemptsMade}):`, err.message);

    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade >= maxAttempts) {
      await moveWorkflowJobToDeadLetter(job.data, err.message).catch((dlqErr) => {
        console.error("[worker] DLQ enqueue failed:", dlqErr);
      });

      await prisma.executionRun
        .update({
          where: { id: job.data.runId },
          data: {
            status: "FAILED",
            completedAt: new Date(),
            errorMessage: err.message.slice(0, 4000),
          },
        })
        .catch(() => undefined);

      void persistAndPublishRunEvent({
        type: "done",
        runId: job.data.runId,
        timestamp: new Date().toISOString(),
        data: { status: "FAILED", error: err.message, deadLetter: true },
      }, job.data.tenantId);
    }
  });

  return worker;
}
