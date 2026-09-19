import { Queue } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";
import { WORKFLOW_DLQ, type WorkflowJobData } from "./queue.js";

let dlq: Queue<WorkflowJobData> | null = null;

export function getWorkflowDeadLetterQueue(): Queue<WorkflowJobData> {
  if (!dlq) {
    dlq = new Queue<WorkflowJobData>(WORKFLOW_DLQ, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 1000,
      },
    });
  }
  return dlq;
}

export async function moveWorkflowJobToDeadLetter(
  data: WorkflowJobData,
  errorMessage: string,
): Promise<void> {
  const queue = getWorkflowDeadLetterQueue();
  await queue.add("failed", { ...data, metaReason: errorMessage }, {
    jobId: `dlq-${data.runId}-${Date.now()}`,
  });
}
