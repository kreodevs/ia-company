import { prisma } from "./prisma.js";
import { parseProductMetadata } from "./product-revenue.js";

export interface ProductMetricsSnapshot {
  revenueUsd: number;
  revenueLastSyncedAt: string | null;
  revenueSource: string | null;
  stripeWebhookConfigured: boolean;
  waitlistCount: number;
  revenueEventCount: number;
  waitlistLastSignupAt: string | null;
}

export async function getProductMetrics(
  tenantId: string,
  productId: string,
): Promise<ProductMetricsSnapshot | null> {
  const product = await prisma.tenantProduct.findFirst({
    where: { id: productId, tenantId },
    select: { id: true, revenueUsd: true, metadata: true },
  });
  if (!product) return null;

  const meta = parseProductMetadata(product.metadata);

  const [waitlistCount, revenueEventCount, lastSignup] = await Promise.all([
    prisma.productWaitlistSignup.count({ where: { productId: product.id } }),
    prisma.productRevenueEvent.count({ where: { productId: product.id } }),
    prisma.productWaitlistSignup.findFirst({
      where: { productId: product.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  return {
    revenueUsd: product.revenueUsd,
    revenueLastSyncedAt: meta.revenueLastSyncedAt ?? null,
    revenueSource: meta.revenueSource ?? null,
    stripeWebhookConfigured: Boolean(meta.stripeWebhookSecret),
    waitlistCount,
    revenueEventCount,
    waitlistLastSignupAt: lastSignup?.createdAt.toISOString() ?? null,
  };
}
