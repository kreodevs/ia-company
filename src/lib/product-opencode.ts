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
  tenantDefaults: {
    defaultAgent: string | null;
    defaultModel: string | null;
    projectPath: string | null;
  };
  effectiveDefaults: {
    defaultAgent: string | null;
    defaultModel: string | null;
    projectPath: string | null;
  };
}

export interface OpencodeDelegationDefaults {
  defaultAgent: string | null;
  defaultModel: string | null;
  projectPath: string | null;
}

export interface OpencodeRunOverrides {
  agent?: string | null;
  model?: string | null;
  projectPath?: string | null;
}

export function readOpencodeRunOverrides(
  sharedMemory: Record<string, unknown> | undefined,
): OpencodeRunOverrides | undefined {
  const raw = sharedMemory?.opencodeRunOverrides;
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  return {
    agent: typeof o.agent === "string" ? o.agent : o.agent === null ? null : undefined,
    model: typeof o.model === "string" ? o.model : o.model === null ? null : undefined,
    projectPath:
      typeof o.projectPath === "string"
        ? o.projectPath
        : o.projectPath === null
          ? null
          : undefined,
  };
}

export function mergeOpencodeRunOverrides(
  base: { defaultAgent: string | null; defaultModel: string | null; projectPath: string | null },
  overrides?: OpencodeRunOverrides,
): { defaultAgent: string | null; defaultModel: string | null; projectPath: string | null } {
  if (!overrides) return base;
  return {
    defaultAgent:
      overrides.agent !== undefined ? overrides.agent?.trim() || null : base.defaultAgent,
    defaultModel:
      overrides.model !== undefined ? overrides.model?.trim() || null : base.defaultModel,
    projectPath:
      overrides.projectPath !== undefined
        ? overrides.projectPath?.trim() || null
        : base.projectPath,
  };
}

export function mergeProductOpencodeDefaults(
  tenantDefaults: OpencodeDelegationDefaults,
  product: {
    opencodeDefaultAgent: string | null;
    opencodeDefaultModel: string | null;
    opencodeProjectPath: string | null;
    slug: string;
  },
): OpencodeDelegationDefaults {
  return {
    defaultAgent: product.opencodeDefaultAgent ?? tenantDefaults.defaultAgent,
    defaultModel: product.opencodeDefaultModel ?? tenantDefaults.defaultModel,
    projectPath:
      product.opencodeProjectPath ??
      tenantDefaults.projectPath ??
      `projects/${product.slug}`,
  };
}

export async function loadTenantOpencodeDefaults(
  tenantId: string,
): Promise<OpencodeDelegationDefaults> {
  const row = await prisma.tenantOpencodeConfig.findUnique({
    where: { tenantId },
    select: { defaultAgent: true, defaultModel: true, defaultProjectPath: true },
  });
  return {
    defaultAgent: row?.defaultAgent ?? null,
    defaultModel: row?.defaultModel ?? null,
    projectPath: row?.defaultProjectPath ?? null,
  };
}

export async function getEffectiveOpencodeDefaults(
  tenantId: string,
  productId?: string | null,
): Promise<OpencodeDelegationDefaults> {
  const tenantDefaults = await loadTenantOpencodeDefaults(tenantId);
  if (!productId) return tenantDefaults;

  const product = await prisma.tenantProduct.findFirst({
    where: { id: productId, tenantId },
    select: {
      slug: true,
      opencodeDefaultAgent: true,
      opencodeDefaultModel: true,
      opencodeProjectPath: true,
    },
  });
  if (!product) return tenantDefaults;

  return mergeProductOpencodeDefaults(tenantDefaults, product);
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

  const tenantDefaults = await loadTenantOpencodeDefaults(tenantId);
  const effectiveDefaults = mergeProductOpencodeDefaults(tenantDefaults, product);

  return {
    productId: product.id,
    defaultAgent: product.opencodeDefaultAgent,
    defaultModel: product.opencodeDefaultModel,
    projectPath: product.opencodeProjectPath,
    suggestedProjectPath: `projects/${product.slug}`,
    tenantDefaults,
    effectiveDefaults,
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
  runOverrides?: OpencodeRunOverrides,
): Promise<TenantOpencodeConfigResolved | null> {
  const base = await resolveTenantOpencodeConfig(tenantId);
  if (!base) return null;

  if (!productId) {
    const merged = mergeOpencodeRunOverrides(
      {
        defaultAgent: base.defaultAgent,
        defaultModel: base.defaultModel,
        projectPath: base.projectPath,
      },
      runOverrides,
    );
    return {
      ...base,
      defaultAgent: merged.defaultAgent,
      defaultModel: merged.defaultModel,
      projectPath: merged.projectPath,
    };
  }

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

  const productDefaults = mergeProductOpencodeDefaults(
    {
      defaultAgent: base.defaultAgent,
      defaultModel: base.defaultModel,
      projectPath: base.projectPath,
    },
    product,
  );
  const merged = mergeOpencodeRunOverrides(productDefaults, runOverrides);

  return {
    ...base,
    defaultAgent: merged.defaultAgent,
    defaultModel: merged.defaultModel,
    projectPath: merged.projectPath,
  };
}
