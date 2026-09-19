import { getRedisConnection } from "./redis.js";

const LOCK_PREFIX = "tenant-run-lock:";
const LOCK_TTL_MS = 30 * 60 * 1000;
const MAX_WAIT_MS = 5 * 60 * 1000;
const POLL_MS = 250;

export async function withTenantRunLock<T>(
  tenantId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const redis = getRedisConnection();
  const key = `${LOCK_PREFIX}${tenantId}`;
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    const acquired = await redis.set(key, token, "PX", LOCK_TTL_MS, "NX");
    if (acquired === "OK") break;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }

  const holder = await redis.get(key);
  if (holder !== token) {
    throw new Error(`Could not acquire tenant run lock for ${tenantId}`);
  }

  try {
    return await fn();
  } finally {
    const current = await redis.get(key);
    if (current === token) {
      await redis.del(key);
    }
  }
}
