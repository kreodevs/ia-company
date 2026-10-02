import { Queue } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";

export const WORKFLOW_QUEUE = "workflow-execution";
export const WORKFLOW_DLQ = "workflow-execution-dlq";

export interface WorkflowJobData {
  runId: string;
  workflowId: string;
  tenantId?: string;
  initialMemory?: Record<string, unknown>;
  mergeConsensus?: boolean;
  syncConsensus?: boolean;
  productId?: string;
  productSlug?: string;
  workflowName?: string;
  metaReason?: string;
  resumeFromStepOrder?: number;
  forceLocalImplementation?: boolean;
  afterOpencodeDelegation?: boolean;
}

let queue: Queue<WorkflowJobData> | null = null;

export function getWorkflowQueue(): Queue<WorkflowJobData> {
  if (!queue) {
    queue = new Queue<WorkflowJobData>(WORKFLOW_QUEUE, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    });
  }
  return queue;
}

export async function enqueueWorkflowRun(data: WorkflowJobData): Promise<string> {
  const job = await getWorkflowQueue().add("execute", data, { jobId: data.runId });
  return job.id!;
}

// ── Agent sessions (Fase 0 — camino B) ──────────────────────────────────────

export const SESSION_QUEUE = "agent-session-execution";
export const SESSION_DLQ = "agent-session-execution-dlq";

export interface SessionJobData {
  sessionId: string;
  runId: string;
  tenantId?: string;
  /** Reanudar sesión ya reclamada (ignora idempotencia de claim). */
  resume?: boolean;
  /** Input humano tras checkpoint need_input. */
  humanInput?: string;
  productSlug?: string;
  productId?: string;
}

let sessionQueue: Queue<SessionJobData> | null = null;
let sessionDlq: Queue<SessionJobData> | null = null;

export function getSessionQueue(): Queue<SessionJobData> {
  if (!sessionQueue) {
    sessionQueue = new Queue<SessionJobData>(SESSION_QUEUE, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    });
  }
  return sessionQueue;
}

export function getSessionDeadLetterQueue(): Queue<SessionJobData> {
  if (!sessionDlq) {
    sessionDlq = new Queue<SessionJobData>(SESSION_DLQ, {
      connection: getRedisConnection(),
      defaultJobOptions: { removeOnComplete: 500, removeOnFail: 500 },
    });
  }
  return sessionDlq;
}

export async function enqueueSessionRun(data: SessionJobData): Promise<string> {
  const job = await getSessionQueue().add("execute-session", data, {
    jobId: data.resume ? `${data.sessionId}-resume-${Date.now()}` : data.sessionId,
  });
  return job.id!;
}
