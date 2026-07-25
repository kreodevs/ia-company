import type { TenantProduct } from "@prisma/client";
import { parseProductMetadata } from "./product-revenue.js";

export interface ClientTenantProduct extends Omit<TenantProduct, "metadata"> {
  stripeWebhookConfigured: boolean;
  revenueLastSyncedAt: string | null;
  revenueSource: string | null;
}

export function serializeTenantProductForClient(product: TenantProduct): ClientTenantProduct {
  const meta = parseProductMetadata(product.metadata);
  const { metadata: _metadata, ...rest } = product;
  return {
    ...rest,
    stripeWebhookConfigured: Boolean(meta.stripeWebhookSecret),
    revenueLastSyncedAt: meta.revenueLastSyncedAt ?? null,
    revenueSource: meta.revenueSource ?? null,
  };
}

export function buildStripeWebhookUrl(productId: string, publicApiBase?: string): string {
  const base = (publicApiBase ?? process.env.PUBLIC_API_URL ?? "http://localhost:3001/api").replace(
    /\/$/,
    "",
  );
  return `${base}/webhooks/stripe/${productId}`;
}

export function buildWaitlistWebhookUrl(productId: string, publicApiBase?: string): string {
  const base = (publicApiBase ?? process.env.PUBLIC_API_URL ?? "http://localhost:3001/api").replace(
    /\/$/,
    "",
  );
  return `${base}/webhooks/waitlist/${productId}`;
}
