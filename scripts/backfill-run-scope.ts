#!/usr/bin/env npx tsx
/**
 * Backfill ExecutionRun.orgUnitId and productId from sharedMemory.
 * Usage: npx tsx scripts/backfill-run-scope.ts [--dry-run] [--tenant-id=...]
 */
import { prisma } from "../src/lib/prisma.js";
import { resolveRunScopeFields } from "../src/lib/run-scope.js";
import { extractRunProductMemory } from "../src/lib/product-run-association.js";

const dryRun = process.argv.includes("--dry-run");
const tenantArg = process.argv.find((a) => a.startsWith("--tenant-id="));
const tenantFilter = tenantArg?.split("=")[1]?.trim() || null;

async function main() {
  const where = tenantFilter ? { tenantId: tenantFilter } : {};
  const runs = await prisma.executionRun.findMany({
    where: {
      ...where,
      OR: [{ orgUnitId: null }, { productId: null }],
    },
    select: { id: true, sharedMemory: true, orgUnitId: true, productId: true, tenantId: true },
    orderBy: { createdAt: "asc" },
  });

  const slugCache = new Map<string, string | null>();
  let updated = 0;

  for (const run of runs) {
    let scope = resolveRunScopeFields({
      sharedMemory: run.sharedMemory,
      orgUnitId: run.orgUnitId,
      productId: run.productId,
    });

    if (!scope.productId && run.tenantId) {
      const { focusProductSlug } = extractRunProductMemory(run.sharedMemory);
      if (focusProductSlug) {
        const cacheKey = `${run.tenantId}:${focusProductSlug}`;
        if (!slugCache.has(cacheKey)) {
          const product = await prisma.tenantProduct.findFirst({
            where: { tenantId: run.tenantId, slug: focusProductSlug },
            select: { id: true },
          });
          slugCache.set(cacheKey, product?.id ?? null);
        }
        scope = { ...scope, productId: slugCache.get(cacheKey) ?? scope.productId };
      }
    }

    const needsOrg = !run.orgUnitId && scope.orgUnitId;
    const needsProduct = !run.productId && scope.productId;
    if (!needsOrg && !needsProduct) continue;

    if (dryRun) {
      console.log(`[dry-run] ${run.id} -> orgUnitId=${scope.orgUnitId ?? "-"} productId=${scope.productId ?? "-"}`);
    } else {
      await prisma.executionRun.update({
        where: { id: run.id },
        data: {
          ...(needsOrg ? { orgUnitId: scope.orgUnitId } : {}),
          ...(needsProduct ? { productId: scope.productId } : {}),
        },
      });
    }
    updated += 1;
  }

  console.log(`${dryRun ? "Would update" : "Updated"} ${updated} run(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
