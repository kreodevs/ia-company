import type { ProductSignalKind, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export interface ProductSignalDto {
  id: string;
  kind: ProductSignalKind;
  title: string;
  payload: Record<string, unknown>;
  amountUsd: number | null;
  createdAt: string;
}

export async function recordProductSignal(input: {
  tenantId: string;
  productId: string;
  kind: ProductSignalKind;
  title: string;
  payload?: Record<string, unknown>;
  amountUsd?: number | null;
}): Promise<ProductSignalDto> {
  const row = await prisma.productSignal.create({
    data: {
      tenantId: input.tenantId,
      productId: input.productId,
      kind: input.kind,
      title: input.title.slice(0, 240),
      payload: (input.payload ?? {}) as Prisma.InputJsonValue,
      amountUsd: input.amountUsd ?? null,
    },
  });
  return serializeSignal(row);
}

function serializeSignal(row: {
  id: string;
  kind: ProductSignalKind;
  title: string;
  payload: unknown;
  amountUsd: number | null;
  createdAt: Date;
}): ProductSignalDto {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    amountUsd: row.amountUsd,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listRecentProductSignals(
  tenantId: string,
  productId: string,
  limit = 20,
): Promise<ProductSignalDto[]> {
  const rows = await prisma.productSignal.findMany({
    where: { tenantId, productId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(serializeSignal);
}

export interface ProductSignalSummary {
  revenueUsd: number;
  waitlistCount: number;
  revenueEvents30d: number;
  waitlistSignups30d: number;
  campaignSignals30d: number;
  daysSinceLastRevenue: number | null;
  pricingCyclesWithoutRevenue: number;
}

export async function getProductSignalSummary(
  tenantId: string,
  productId: string,
): Promise<ProductSignalSummary> {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [product, waitlistCount, revenueEvents30d, waitlistSignups30d, campaignSignals30d, lastRevenue] =
    await Promise.all([
      prisma.tenantProduct.findFirst({
        where: { id: productId, tenantId },
        select: { revenueUsd: true, metadata: true, createdAt: true },
      }),
      prisma.productWaitlistSignup.count({ where: { productId } }),
      prisma.productRevenueEvent.count({
        where: { productId, createdAt: { gte: since30d } },
      }),
      prisma.productWaitlistSignup.count({
        where: { productId, createdAt: { gte: since30d } },
      }),
      prisma.productSignal.count({
        where: { productId, kind: "campaign_metric", createdAt: { gte: since30d } },
      }),
      prisma.productRevenueEvent.findFirst({
        where: { productId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

  const revenueUsd = product?.revenueUsd ?? 0;
  const daysSinceLastRevenue = lastRevenue
    ? Math.floor((Date.now() - lastRevenue.createdAt.getTime()) / (24 * 60 * 60 * 1000))
    : revenueUsd > 0
      ? 0
      : Math.floor((Date.now() - (product?.createdAt.getTime() ?? Date.now())) / (24 * 60 * 60 * 1000));

  const meta =
    product?.metadata && typeof product.metadata === "object"
      ? (product.metadata as Record<string, unknown>)
      : {};
  const pricingCyclesWithoutRevenue =
    typeof meta.pricingCyclesWithoutRevenue === "number" ? meta.pricingCyclesWithoutRevenue : 0;

  return {
    revenueUsd,
    waitlistCount,
    revenueEvents30d,
    waitlistSignups30d,
    campaignSignals30d,
    daysSinceLastRevenue,
    pricingCyclesWithoutRevenue,
  };
}

export async function ingestCampaignMetricSignal(input: {
  tenantId: string;
  productId: string;
  metric: string;
  value: number;
  source?: string;
}): Promise<ProductSignalDto> {
  return recordProductSignal({
    tenantId: input.tenantId,
    productId: input.productId,
    kind: "campaign_metric",
    title: `Campaign ${input.metric}: ${input.value}`,
    payload: { metric: input.metric, value: input.value, source: input.source ?? "webhook" },
  });
}
