export interface RunProductMemory {
  productId?: unknown;
  focusProductSlug?: unknown;
}

export function extractRunProductMemory(sharedMemory: unknown): {
  productId: string | null;
  focusProductSlug: string | null;
} {
  if (!sharedMemory || typeof sharedMemory !== "object" || Array.isArray(sharedMemory)) {
    return { productId: null, focusProductSlug: null };
  }
  const mem = sharedMemory as RunProductMemory;
  return {
    productId: typeof mem.productId === "string" ? mem.productId : null,
    focusProductSlug: typeof mem.focusProductSlug === "string" ? mem.focusProductSlug : null,
  };
}

export function extractRunTaskPreview(sharedMemory: unknown, maxLen = 120): string | null {
  if (!sharedMemory || typeof sharedMemory !== "object" || Array.isArray(sharedMemory)) {
    return null;
  }
  const mem = sharedMemory as { task?: unknown; nextAction?: unknown };
  const raw =
    typeof mem.task === "string" && mem.task.trim()
      ? mem.task.trim()
      : typeof mem.nextAction === "string" && mem.nextAction.trim()
        ? mem.nextAction.trim()
        : null;
  if (!raw) return null;
  return raw.length > maxLen ? `${raw.slice(0, maxLen - 1)}…` : raw;
}

export function runBelongsToProduct(
  run: { id: string; sharedMemory: unknown },
  product: { id: string; slug: string; lastRunId?: string | null },
  options: { isFocusProduct?: boolean } = {},
): boolean {
  if (product.lastRunId && run.id === product.lastRunId) return true;

  const { productId, focusProductSlug } = extractRunProductMemory(run.sharedMemory);
  if (productId === product.id || focusProductSlug === product.slug) return true;

  // Tenant-scoped runs (schedules, manual workflows) show on the focused product war room.
  if (options.isFocusProduct && !productId && !focusProductSlug) return true;

  return false;
}

export async function resolveFocusProductForTenant(tenantId: string) {
  const { ensureTenantCycleState } = await import("./product-registry.js");
  const { prisma } = await import("./prisma.js");
  const cycle = await ensureTenantCycleState(tenantId);
  if (!cycle.focusProductId) return null;
  return prisma.tenantProduct.findFirst({
    where: { id: cycle.focusProductId, tenantId, phase: { not: "archived" } },
    select: { id: true, slug: true, name: true },
  });
}
