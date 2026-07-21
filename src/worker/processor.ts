import { Worker } from "bullmq";
import { WorkflowExecutor } from "../core/engine.js";
import { getRedisConnection } from "../lib/redis.js";
import { clearRunCancellation, isRunCancelled } from "./run-control.js";
import { WORKFLOW_QUEUE, type WorkflowJobData } from "./queue.js";
import { prisma } from "../lib/prisma.js";

export function startWorkflowWorker(): Worker<WorkflowJobData> {
  const executor = new WorkflowExecutor();

  const worker = new Worker<WorkflowJobData>(
    WORKFLOW_QUEUE,
    async (job) => {
      const { runId, workflowId, tenantId, initialMemory } = job.data;

      if (isRunCancelled(runId)) {
        await prisma.executionRun.update({
          where: { id: runId },
          data: { status: "CANCELLED", completedAt: new Date() },
        });
        clearRunCancellation(runId);
        return;
      }

      await executor.runExisting(runId, workflowId, {
        tenantId,
        initialMemory,
      });
      clearRunCancellation(runId);
    },
    { connection: getRedisConnection(), concurrency: 2 },
  );

  worker.on("failed", async (job, err) => {
    if (!job) return;
    console.error(`Workflow job ${job.id} failed:`, err.message);
  });

  return worker;
}
