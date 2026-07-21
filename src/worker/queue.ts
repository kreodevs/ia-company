import { Queue } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";

export const WORKFLOW_QUEUE = "workflow-execution";

export interface WorkflowJobData {
  runId: string;
  workflowId: string;
  tenantId?: string;
  initialMemory?: Record<string, unknown>;
  mergeConsensus?: boolean;
  syncConsensus?: boolean;
}

let queue: Queue<WorkflowJobData> | null = null;

export function getWorkflowQueue(): Queue<WorkflowJobData> {
  if (!queue) {
    queue = new Queue<WorkflowJobData>(WORKFLOW_QUEUE, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: 1,
      },
    });
  }
  return queue;
}

export async function enqueueWorkflowRun(data: WorkflowJobData): Promise<string> {
  const job = await getWorkflowQueue().add("execute", data, { jobId: data.runId });
  return job.id!;
}
