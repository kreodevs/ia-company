import { randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ProductWaitlistMetadata {
  waitlistApiKey?: string;
}

export function parseWaitlistMetadata(raw: unknown): ProductWaitlistMetadata {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  return {
    waitlistApiKey:
      typeof obj.waitlistApiKey === "string" && obj.waitlistApiKey.length > 0
        ? obj.waitlistApiKey
        : undefined,
  };
}

export async function ensureWaitlistApiKey(productId: string): Promise<string> {
  const product = await prisma.tenantProduct.findUnique({
    where: { id: productId },
    select: { id: true, metadata: true },
  });
  if (!product) throw new Error("Product not found");

  const meta =
    typeof product.metadata === "object" && product.metadata
      ? ({ ...(product.metadata as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  const existing = parseWaitlistMetadata(meta).waitlistApiKey;
  if (existing) return existing;

  const waitlistApiKey = randomBytes(24).toString("hex");
  meta.waitlistApiKey = waitlistApiKey;
  await prisma.tenantProduct.update({
    where: { id: product.id },
    data: { metadata: meta as object },
  });
  return waitlistApiKey;
}

export async function recordWaitlistSignup(input: {
  productId: string;
  tenantId: string;
  email: string;
  apiKey: string;
  source?: string;
}): Promise<{ created: boolean; waitlistCount: number }> {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalizedEmail)) {
    throw new Error("Invalid email address");
  }

  const product = await prisma.tenantProduct.findFirst({
    where: { id: input.productId, tenantId: input.tenantId },
    select: { id: true, metadata: true },
  });
  if (!product) throw new Error("Product not found");

  const apiKey = parseWaitlistMetadata(product.metadata).waitlistApiKey;
  if (!apiKey || input.apiKey !== apiKey) {
    throw new Error("Invalid waitlist API key");
  }

  let created = false;
  try {
    await prisma.productWaitlistSignup.create({
      data: {
        productId: product.id,
        email: normalizedEmail,
        source: input.source?.trim() || null,
      },
    });
    created = true;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "P2002") throw err;
  }

  const waitlistCount = await prisma.productWaitlistSignup.count({
    where: { productId: product.id },
  });

  return { created, waitlistCount };
}
