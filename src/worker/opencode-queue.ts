import { Queue } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";

export const OPENCODE_QUEUE = "opencode-delegation";

export interface OpencodePollJobData {
  delegationId: string;
}

let queue: Queue<OpencodePollJobData> | null = null;

export function getOpencodeQueue(): Queue<OpencodePollJobData> {
  if (!queue) {
    queue = new Queue<OpencodePollJobData>(OPENCODE_QUEUE, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 200,
        attempts: 5,
        backoff: { type: "exponential", delay: 3000 },
      },
    });
  }
  return queue;
}

export async function enqueueOpencodePoll(data: OpencodePollJobData): Promise<string> {
  const job = await getOpencodeQueue().add("poll", data, {
    jobId: `opencode-${data.delegationId}`,
    delay: 2000,
  });
  return job.id!;
}

export async function requeueOpencodePoll(data: OpencodePollJobData, delayMs: number): Promise<void> {
  await getOpencodeQueue().add("poll", data, {
    jobId: `opencode-${data.delegationId}-${Date.now()}`,
    delay: delayMs,
  });
}
