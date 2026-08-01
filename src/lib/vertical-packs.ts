import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { ProductPhase } from "@prisma/client";
import { prisma } from "./prisma.js";
import { registerExistingProduct, setFocusProduct } from "./product-registry.js";
import { ensurePlatformWorkflowOnTenant } from "../server/lib/clone-templates.js";
import {
  emptyProductProfile,
  loadProductProfile,
  saveProductProfile,
  type ProductProfile,
} from "./product-profile.js";
import {
  PRODUCT_WORK_PRESETS,
  type ProductWorkPreset,
} from "./product-work-presets.js";
import { resolveProductWorkspaceRoot } from "./product-workspace.js";

export interface VerticalPackPresetOverride {
  presetId: string;
  primary?: boolean;
  taskTemplate?: string;
  deliverableHint?: string;
}

export interface VerticalPackManifest {
  id: string;
  version: number;
  name: string;
  tagline: string;
  product: {
    slug: string;
    name: string;
    description?: string;
    phase?: ProductPhase;
    githubRepoUrl?: string | null;
  };
  workflows: string[];
  presets: VerticalPackPresetOverride[];
  profileSeed?: Partial<ProductProfile>;
  playbookPath?: string;
  defaultNextAction?: string;
}

export interface VerticalPackSummary {
  id: string;
  version: number;
  name: string;
  tagline: string;
  productSlug: string;
  workflowCount: number;
  presetCount: number;
  hasCode: boolean;
  playbookPath: string | null;
}

export interface VerticalPackListItem extends VerticalPackSummary {
  applied: boolean;
  appliedProductId: string | null;
}

export interface ApplyVerticalPackResult {
  productId: string;
  productSlug: string;
  productName: string;
  packId: string;
  workflowsEnsured: string[];
  focusSet: boolean;
  profileSeeded: boolean;
}

let cachedPacks: VerticalPackManifest[] | null = null;

function projectsRoot(): string {
  return join(resolve(process.env.WORKSPACE_ROOT ?? process.cwd()), "projects");
}

function parsePackManifest(raw: unknown, filePath: string): VerticalPackManifest | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const tagline = typeof o.tagline === "string" ? o.tagline.trim() : "";
  const version = typeof o.version === "number" ? o.version : 1;
  if (!id || !name) {
    console.warn(`[vertical-packs] Invalid manifest (missing id/name): ${filePath}`);
    return null;
  }

  const productRaw = o.product;
  if (!productRaw || typeof productRaw !== "object") return null;
  const productObj = productRaw as Record<string, unknown>;
  const slug = typeof productObj.slug === "string" ? productObj.slug.trim().toLowerCase() : "";
  const productName = typeof productObj.name === "string" ? productObj.name.trim() : "";
  if (!slug || !productName) return null;

  const workflows = Array.isArray(o.workflows)
    ? o.workflows.filter((w): w is string => typeof w === "string" && w.trim().length > 0)
    : [];

  const presets: VerticalPackPresetOverride[] = Array.isArray(o.presets)
    ? o.presets
        .map((entry): VerticalPackPresetOverride | null => {
          if (!entry || typeof entry !== "object") return null;
          const p = entry as Record<string, unknown>;
          const presetId = typeof p.presetId === "string" ? p.presetId.trim() : "";
          if (!presetId) return null;
          return {
            presetId,
            ...(typeof p.primary === "boolean" ? { primary: p.primary } : {}),
            ...(typeof p.taskTemplate === "string" ? { taskTemplate: p.taskTemplate } : {}),
            ...(typeof p.deliverableHint === "string" ? { deliverableHint: p.deliverableHint } : {}),
          };
        })
        .filter((x): x is VerticalPackPresetOverride => x != null)
    : [];

  let profileSeed: Partial<ProductProfile> | undefined;
  if (o.profileSeed && typeof o.profileSeed === "object") {
    profileSeed = o.profileSeed as Partial<ProductProfile>;
  }

  const phase =
    typeof productObj.phase === "string" ? (productObj.phase as ProductPhase) : undefined;

  return {
    id,
    version,
    name,
    tagline,
    product: {
      slug,
      name: productName,
      description:
        typeof productObj.description === "string" ? productObj.description.trim() : undefined,
      phase,
      githubRepoUrl:
        typeof productObj.githubRepoUrl === "string" ? productObj.githubRepoUrl.trim() : null,
    },
    workflows,
    presets,
    profileSeed,
    playbookPath: typeof o.playbookPath === "string" ? o.playbookPath.trim() : undefined,
    defaultNextAction:
      typeof o.defaultNextAction === "string" ? o.defaultNextAction.trim() : undefined,
  };
}

export async function discoverVerticalPacks(): Promise<VerticalPackManifest[]> {
  if (cachedPacks) return cachedPacks;

  const base = projectsRoot();
  let dirs: string[] = [];
  try {
    const entries = await readdir(base, { withFileTypes: true });
    dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    cachedPacks = [];
    return cachedPacks;
  }

  const packs: VerticalPackManifest[] = [];
  for (const dir of dirs.sort()) {
    const manifestPath = join(base, dir, "vertical-pack.json");
    try {
      const text = await readFile(manifestPath, "utf8");
      const parsed = parsePackManifest(JSON.parse(text), manifestPath);
      if (parsed) packs.push(parsed);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn(`[vertical-packs] Failed to read ${manifestPath}:`, err);
      }
    }
  }

  cachedPacks = packs;
  return packs;
}

export function clearVerticalPackCache(): void {
  cachedPacks = null;
}

export async function getVerticalPackById(packId: string): Promise<VerticalPackManifest | null> {
  const packs = await discoverVerticalPacks();
  return packs.find((p) => p.id === packId) ?? null;
}

export async function getVerticalPackForProductSlug(
  productSlug: string,
): Promise<VerticalPackManifest | null> {
  const packs = await discoverVerticalPacks();
  return packs.find((p) => p.product.slug === productSlug) ?? null;
}

async function workspaceHasCode(slug: string): Promise<boolean> {
  try {
    const root = resolveProductWorkspaceRoot(slug);
    const entries = await readdir(root);
    return entries.some((e) => e !== ".git" && e !== "docs");
  } catch {
    return false;
  }
}

export async function toVerticalPackSummary(pack: VerticalPackManifest): Promise<VerticalPackSummary> {
  return {
    id: pack.id,
    version: pack.version,
    name: pack.name,
    tagline: pack.tagline,
    productSlug: pack.product.slug,
    workflowCount: pack.workflows.length,
    presetCount: pack.presets.length,
    hasCode: await workspaceHasCode(pack.product.slug),
    playbookPath: pack.playbookPath ?? null,
  };
}

export async function listVerticalPacksForTenant(tenantId: string): Promise<VerticalPackListItem[]> {
  const packs = await discoverVerticalPacks();
  const products = await prisma.tenantProduct.findMany({
    where: { tenantId },
    select: { id: true, slug: true, metadata: true },
  });
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const items: VerticalPackListItem[] = [];
  for (const pack of packs) {
    const summary = await toVerticalPackSummary(pack);
    const existing = bySlug.get(pack.product.slug);
    items.push({
      ...summary,
      applied: existing != null,
      appliedProductId: existing?.id ?? null,
    });
  }
  return items;
}

export function mergePresetsForPack(pack: VerticalPackManifest | null): ProductWorkPreset[] {
  if (!pack || pack.presets.length === 0) {
    return [...PRODUCT_WORK_PRESETS];
  }

  const overrideById = new Map(pack.presets.map((p) => [p.presetId, p]));
  const allowedIds = new Set(pack.presets.map((p) => p.presetId));

  return PRODUCT_WORK_PRESETS.filter((base) => allowedIds.has(base.id)).map((base) => {
    const override = overrideById.get(base.id);
    if (!override) return base;
    return {
      ...base,
      ...(override.primary != null ? { primary: override.primary } : {}),
      ...(override.taskTemplate ? { taskTemplate: override.taskTemplate } : {}),
      ...(override.deliverableHint ? { deliverableHint: override.deliverableHint } : {}),
    };
  });
}

export function getPresetsForProductSlug(productSlug?: string | null): ProductWorkPreset[] {
  if (!productSlug) return [...PRODUCT_WORK_PRESETS];
  const pack = cachedPacks?.find((p) => p.product.slug === productSlug) ?? null;
  if (!pack) return [...PRODUCT_WORK_PRESETS];
  return mergePresetsForPack(pack);
}

export async function ensurePresetsForProductSlug(
  productSlug?: string | null,
): Promise<ProductWorkPreset[]> {
  if (!productSlug) return [...PRODUCT_WORK_PRESETS];
  const pack = await getVerticalPackForProductSlug(productSlug);
  return mergePresetsForPack(pack);
}

export function findPresetById(
  presetId: string,
  productSlug?: string | null,
): ProductWorkPreset | null {
  const presets = getPresetsForProductSlug(productSlug);
  return presets.find((p) => p.id === presetId) ?? null;
}

export async function findPresetByIdAsync(
  presetId: string,
  productSlug?: string | null,
): Promise<ProductWorkPreset | null> {
  const presets = await ensurePresetsForProductSlug(productSlug);
  return presets.find((p) => p.id === presetId) ?? null;
}

export async function applyVerticalPack(
  tenantId: string,
  packId: string,
  options?: { setFocus?: boolean; seedProfile?: boolean },
): Promise<ApplyVerticalPackResult> {
  const pack = await getVerticalPackById(packId);
  if (!pack) throw new Error("Vertical pack not found");

  const { product } = await registerExistingProduct({
    tenantId,
    name: pack.product.name,
    slug: pack.product.slug,
    description: pack.product.description,
    phase: pack.product.phase ?? "building",
    githubRepoUrl: pack.product.githubRepoUrl ?? undefined,
  });

  const workflowsEnsured: string[] = [];
  for (const workflowName of pack.workflows) {
    const wf = await ensurePlatformWorkflowOnTenant(tenantId, workflowName);
    if (wf) workflowsEnsured.push(wf.name);
  }

  let profileSeeded = false;
  const shouldSeed = options?.seedProfile !== false;
  if (shouldSeed && pack.profileSeed) {
    const existing = await loadProductProfile(product.id);
    if (!existing) {
      await saveProductProfile(product.id, pack.product.slug, {
        ...emptyProductProfile(),
        ...pack.profileSeed,
      });
      profileSeeded = true;
    }
  }

  const existingMeta =
    product.metadata && typeof product.metadata === "object"
      ? (product.metadata as Record<string, unknown>)
      : {};

  await prisma.tenantProduct.update({
    where: { id: product.id },
    data: {
      metadata: {
        ...existingMeta,
        verticalPackId: pack.id,
        verticalPackVersion: pack.version,
        verticalPackAppliedAt: new Date().toISOString(),
      },
    },
  });

  if (pack.defaultNextAction) {
    const { buildInitialConsensusWithDescription } = await import("./product-intake.js");
    const consensusContent = buildInitialConsensusWithDescription(
      pack.product.name,
      pack.product.description ?? pack.tagline,
    );
    await prisma.productConsensus.update({
      where: { productId: product.id },
      data: {
        content: consensusContent,
        nextAction: pack.defaultNextAction,
      },
    });
    const { syncProductConsensusToWorkspace } = await import("./product-consensus.js");
    await syncProductConsensusToWorkspace(product.id, pack.product.slug);
  }

  const setFocus = options?.setFocus !== false;
  if (setFocus) {
    await setFocusProduct(tenantId, product.id);
  }

  return {
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    packId: pack.id,
    workflowsEnsured,
    focusSet: setFocus,
    profileSeeded,
  };
}
