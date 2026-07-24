import { prisma } from "./prisma.js";
import {
  resolveTenantOpencodeConfig,
  type TenantOpencodeConfigResolved,
} from "./tenant-opencode.js";

export interface ProductOpencodeSettings {
  productId: string;
  defaultAgent: string | null;
  defaultModel: string | null;
  projectPath: string | null;
  suggestedProjectPath: string;
}

export async function getProductOpencodeSettings(
  tenantId: string,
  productId: string,
): Promise<ProductOpencodeSettings | null> {
  const product = await prisma.tenantProduct.findFirst({
    where: { id: productId, tenantId },
    select: {
      id: true,
      slug: true,
      opencodeDefaultAgent: true,
      opencodeDefaultModel: true,
      opencodeProjectPath: true,
    },
  });
  if (!product) return null;

  return {
    productId: product.id,
    defaultAgent: product.opencodeDefaultAgent,
    defaultModel: product.opencodeDefaultModel,
    projectPath: product.opencodeProjectPath,
    suggestedProjectPath: `projects/${product.slug}`,
  };
}

export async function updateProductOpencodeSettings(
  tenantId: string,
  productId: string,
  input: {
    defaultAgent?: string | null;
    defaultModel?: string | null;
    projectPath?: string | null;
  },
): Promise<ProductOpencodeSettings | null> {
  const existing = await prisma.tenantProduct.findFirst({
    where: { id: productId, tenantId },
    select: { id: true },
  });
  if (!existing) return null;

  await prisma.tenantProduct.update({
    where: { id: productId },
    data: {
      ...(input.defaultAgent !== undefined
        ? { opencodeDefaultAgent: input.defaultAgent?.trim() || null }
        : {}),
      ...(input.defaultModel !== undefined
        ? { opencodeDefaultModel: input.defaultModel?.trim() || null }
        : {}),
      ...(input.projectPath !== undefined
        ? { opencodeProjectPath: input.projectPath?.trim() || null }
        : {}),
    },
  });

  return getProductOpencodeSettings(tenantId, productId);
}

export async function resolveOpencodeDelegationConfig(
  tenantId: string,
  productId?: string | null,
): Promise<TenantOpencodeConfigResolved | null> {
  const base = await resolveTenantOpencodeConfig(tenantId);
  if (!base) return null;

  if (!productId) return base;

  const product = await prisma.tenantProduct.findFirst({
    where: { id: productId, tenantId },
    select: {
      slug: true,
      opencodeDefaultAgent: true,
      opencodeDefaultModel: true,
      opencodeProjectPath: true,
    },
  });
  if (!product) return base;

  return {
    ...base,
    defaultAgent: product.opencodeDefaultAgent,
    defaultModel: product.opencodeDefaultModel,
    projectPath: product.opencodeProjectPath ?? `projects/${product.slug}`,
  };
}
