import type { ExecutionEvent } from "../types/index.js";
import { prisma } from "./prisma.js";
import { getRedisConnection } from "./redis.js";

const RUN_EVENT_CHANNEL_PREFIX = "run-events:";

type LogEmitter = (event: ExecutionEvent) => void;

const localSubscribers = new Map<string, Set<LogEmitter>>();

function notifyLocal(event: ExecutionEvent): void {
  localSubscribers.get(event.runId)?.forEach((fn) => fn(event));
}

export function subscribeToRunLocal(runId: string, emit: LogEmitter): () => void {
  if (!localSubscribers.has(runId)) {
    localSubscribers.set(runId, new Set());
  }
  localSubscribers.get(runId)!.add(emit);
  return () => localSubscribers.get(runId)?.delete(emit);
}

export async function persistRunEvent(
  event: ExecutionEvent,
  tenantId?: string | null,
): Promise<void> {
  try {
    await prisma.executionRunEvent.create({
      data: {
        runId: event.runId,
        tenantId: tenantId ?? null,
        type: event.type,
        payload: event.data as object,
      },
    });
  } catch (err) {
    console.warn("[run-events] persist failed:", err);
  }
}

export async function publishRunEvent(event: ExecutionEvent): Promise<void> {
  try {
    const redis = getRedisConnection();
    await redis.publish(`${RUN_EVENT_CHANNEL_PREFIX}${event.runId}`, JSON.stringify(event));
  } catch (err) {
    console.warn("[run-events] publish failed:", err);
  }
}

export async function persistAndPublishRunEvent(
  event: ExecutionEvent,
  tenantId?: string | null,
): Promise<void> {
  notifyLocal(event);
  await Promise.all([persistRunEvent(event, tenantId), publishRunEvent(event)]);
}

export function subscribeToRunEvents(runId: string, emit: LogEmitter): () => void {
  const unsubLocal = subscribeToRunLocal(runId, emit);
  const subscriber = getRedisConnection().duplicate();
  const channel = `${RUN_EVENT_CHANNEL_PREFIX}${runId}`;
  let closed = false;

  void subscriber.subscribe(channel).catch((err) => {
    console.warn("[run-events] redis subscribe failed:", err);
  });

  subscriber.on("message", (receivedChannel, message) => {
    if (closed || receivedChannel !== channel) return;
    try {
      emit(JSON.parse(message) as ExecutionEvent);
    } catch {
      // ignore malformed payloads
    }
  });

  return () => {
    closed = true;
    unsubLocal();
    void subscriber.unsubscribe(channel).catch(() => undefined);
    void subscriber.quit().catch(() => undefined);
  };
}

export async function listRunEventsForReplay(runId: string, limit = 500): Promise<ExecutionEvent[]> {
  const rows = await prisma.executionRunEvent.findMany({
    where: { runId },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return rows.map((row) => ({
    type: row.type as ExecutionEvent["type"],
    runId: row.runId,
    timestamp: row.createdAt.toISOString(),
    data: (row.payload ?? {}) as Record<string, unknown>,
  }));
}
