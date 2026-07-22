import { Worker } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";
import { pollOpencodeDelegation } from "../lib/opencode-bridge.js";
import { resolveTenantOpencodeConfig } from "../lib/tenant-opencode.js";
import { prisma } from "../lib/prisma.js";
import { OPENCODE_QUEUE, requeueOpencodePoll, type OpencodePollJobData } from "./opencode-queue.js";

export function startOpencodeWorker(): Worker<OpencodePollJobData> {
  const worker = new Worker<OpencodePollJobData>(
    OPENCODE_QUEUE,
    async (job) => {
      const result = await pollOpencodeDelegation(job.data.delegationId);
      if (result === "continue") {
        const delegation = await prisma.opencodeDelegation.findUnique({
          where: { id: job.data.delegationId },
        });
        if (!delegation) return;
        const config = await resolveTenantOpencodeConfig(delegation.tenantId);
        await requeueOpencodePoll(job.data, config?.pollIntervalMs ?? 5000);
      }
    },
    { connection: getRedisConnection(), concurrency: 4 },
  );

  worker.on("failed", (job, err) => {
    console.error(`OpenCode poll job ${job?.id} failed:`, err.message);
  });

  return worker;
}
