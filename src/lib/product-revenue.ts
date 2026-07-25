import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "./prisma.js";

export interface ProductRevenueMetadata {
  stripeWebhookSecret?: string;
  revenueLastSyncedAt?: string;
  revenueSource?: string;
}

export function parseProductMetadata(raw: unknown): ProductRevenueMetadata {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  return {
    stripeWebhookSecret:
      typeof obj.stripeWebhookSecret === "string" ? obj.stripeWebhookSecret : undefined,
    revenueLastSyncedAt:
      typeof obj.revenueLastSyncedAt === "string" ? obj.revenueLastSyncedAt : undefined,
    revenueSource: typeof obj.revenueSource === "string" ? obj.revenueSource : undefined,
  };
}

export async function recordProductRevenue(input: {
  productId: string;
  tenantId: string;
  amountUsd: number;
  source: string;
  cumulative?: boolean;
}): Promise<{ revenueUsd: number }> {
  if (!Number.isFinite(input.amountUsd) || input.amountUsd < 0) {
    throw new Error("Invalid revenue amount");
  }

  const product = await prisma.tenantProduct.findFirst({
    where: { id: input.productId, tenantId: input.tenantId },
    select: { id: true, revenueUsd: true, metadata: true },
  });
  if (!product) throw new Error("Product not found");

  const revenueUsd = input.cumulative
    ? input.amountUsd
    : Math.round((product.revenueUsd + input.amountUsd) * 100) / 100;

  await prisma.tenantProduct.update({
    where: { id: product.id },
    data: {
      revenueUsd,
      metadata: {
        ...(typeof product.metadata === "object" && product.metadata ? product.metadata : {}),
        revenueLastSyncedAt: new Date().toISOString(),
        revenueSource: input.source,
      },
    },
  });

  return { revenueUsd };
}

/** Parse Stripe webhook payload and update product revenue when applicable. */
export async function ingestStripeWebhook(input: {
  productId: string;
  tenantId: string;
  payload: Buffer;
  signature: string | undefined;
}): Promise<{
  handled: boolean;
  duplicate?: boolean;
  revenueUsd?: number;
  eventType?: string;
}> {
  const product = await prisma.tenantProduct.findFirst({
    where: { id: input.productId, tenantId: input.tenantId },
    select: { id: true, metadata: true },
  });
  if (!product) throw new Error("Product not found");

  const meta = parseProductMetadata(product.metadata);
  const secret = meta.stripeWebhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Stripe webhook secret is not configured for this product");
  }

  let event: { id?: string; type: string; data?: { object?: Record<string, unknown> } };
  try {
    event = parseStripeEvent(input.payload, input.signature, secret);
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : "Invalid Stripe webhook");
  }

  const revenueEvents = new Set([
    "checkout.session.completed",
    "invoice.paid",
    "payment_intent.succeeded",
  ]);

  if (!revenueEvents.has(event.type)) {
    return { handled: false, eventType: event.type };
  }

  const object = event.data?.object ?? {};
  const amountUsd = extractStripeAmountUsd(object);
  if (amountUsd <= 0) {
    return { handled: false, eventType: event.type };
  }

  const stripeEventId = event.id?.trim();
  if (!stripeEventId) {
    throw new Error("Stripe event id is missing");
  }

  try {
    await prisma.productRevenueEvent.create({
      data: {
        productId: product.id,
        stripeEventId,
        amountUsd,
        eventType: event.type,
      },
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "P2002") {
      return { handled: true, duplicate: true, eventType: event.type };
    }
    throw err;
  }

  const { revenueUsd } = await recordProductRevenue({
    productId: product.id,
    tenantId: input.tenantId,
    amountUsd,
    source: `stripe:${event.type}`,
  });

  try {
    const { recordProductSignal } = await import("./product-signals.js");
    await recordProductSignal({
      tenantId: input.tenantId,
      productId: product.id,
      kind: "revenue_received",
      title: `Payment received ($${amountUsd})`,
      amountUsd,
      payload: { eventType: event.type, stripeEventId },
    });
    const { syncRecommendationsToDesk } = await import("./product-desk-recommender.js");
    await syncRecommendationsToDesk({ tenantId: input.tenantId, productId: product.id });
  } catch (err) {
    console.warn("[stripe] signal sync failed:", err);
  }

  return { handled: true, revenueUsd, eventType: event.type };
}

function extractStripeAmountUsd(object: Record<string, unknown>): number {
  const cents =
    typeof object.amount_total === "number"
      ? object.amount_total
      : typeof object.amount_received === "number"
        ? object.amount_received
        : typeof object.amount === "number"
          ? object.amount
          : 0;
  return cents > 0 ? Math.round((cents / 100) * 100) / 100 : 0;
}

export function buildStripeTestSignature(
  payload: Buffer,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000),
): string {
  const signedPayload = `${timestamp}.${payload.toString("utf8")}`;
  const v1 = createHmac("sha256", secret).update(signedPayload).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

function parseStripeEvent(
  payload: Buffer,
  signature: string | undefined,
  secret: string,
): { id?: string; type: string; data?: { object?: Record<string, unknown> } } {
  if (!signature) {
    throw new Error("Missing Stripe-Signature header");
  }

  const parts = signature.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});

  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) {
    throw new Error("Invalid Stripe-Signature header");
  }

  const signedPayload = `${timestamp}.${payload.toString("utf8")}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

  const sigBuffer = Buffer.from(v1, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    throw new Error("Stripe signature verification failed");
  }

  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (ageSec > 300) {
    throw new Error("Stripe webhook timestamp too old");
  }

  const parsed = JSON.parse(payload.toString("utf8")) as {
    id?: string;
    type: string;
    data?: { object?: Record<string, unknown> };
  };
  return parsed;
}
