/**
 * One-shot product launch (production ops).
 * Usage: LAUNCH_ONE_SHOT="productSlug:presetId[:task]" npx tsx scripts/launch-product-test.ts
 */
import { prisma } from "../dist/src/lib/prisma.js";
import { launchProductWork } from "../dist/src/lib/product-work-launcher.js";

async function main() {
  const raw = process.env.LAUNCH_ONE_SHOT?.trim();
  if (!raw) {
    console.error("LAUNCH_ONE_SHOT required, e.g. alebrije-memoria:seo-review");
    process.exit(1);
  }

  const [productSlug, presetId, ...taskParts] = raw.split(":");
  const task = taskParts.join(":").trim() || undefined;

  if (!productSlug || !presetId) {
    console.error("Format: productSlug:presetId[:task]");
    process.exit(1);
  }

  const product = await prisma.tenantProduct.findFirst({
    where: { slug: productSlug },
    select: { id: true, tenantId: true, name: true, slug: true },
  });

  if (!product) {
    console.error(`Product not found: ${productSlug}`);
    process.exit(1);
  }

  console.log(`Launching preset "${presetId}" for ${product.name} (${product.slug})…`);

  const result = await launchProductWork(product.tenantId, product.id, {
    presetId,
    task,
    mergeConsensus: true,
    setFocus: true,
  });

  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
