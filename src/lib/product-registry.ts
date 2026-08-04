import type { CompanyPhase, GoNoGoDecision, ProductPhase, TenantProduct } from "@prisma/client";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { prisma } from "./prisma.js";
import { ensureProductConsensus } from "./product-consensus.js";
import {
  bootstrapProductWorkspace,
  ensureProductWorkspace,
  resolveProductWorkspaceRoot,
  slugifyProductName,
} from "./product-workspace.js";
import { MAX_BUILDING_PRODUCTS } from "./workflow-names.js";

export async function ensureTenantCycleState(tenantId: string) {
  return prisma.tenantCycleState.upsert({
    where: { tenantId },
    update: {},
    create: { tenantId },
  });
}

export async function listTenantProducts(tenantId: string) {
  return prisma.tenantProduct.findMany({
    where: { tenantId, phase: { not: "archived" } },
    orderBy: [{ phase: "asc" }, { pipelineRank: "asc" }, { createdAt: "asc" }],
  });
}

export async function countBuildingProducts(tenantId: string): Promise<number> {
  return prisma.tenantProduct.count({
    where: { tenantId, phase: { in: ["building", "launching"] } },
  });
}

export async function getProductBySlug(tenantId: string, slug: string) {
  return prisma.tenantProduct.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
  });
}

export async function upsertTenantProduct(input: {
  tenantId: string;
  slug: string;
  name: string;
  description?: string;
  phase?: ProductPhase;
  goNoGo?: GoNoGoDecision;
  revenueUsd?: number;
}) {
  return prisma.tenantProduct.upsert({
    where: { tenantId_slug: { tenantId: input.tenantId, slug: input.slug } },
    update: {
      name: input.name,
      description: input.description,
      phase: input.phase,
      goNoGo: input.goNoGo,
      revenueUsd: input.revenueUsd,
    },
    create: {
      tenantId: input.tenantId,
      slug: input.slug,
      name: input.name,
      description: input.description,
      phase: input.phase ?? "queued",
      goNoGo: input.goNoGo ?? "pending",
      revenueUsd: input.revenueUsd ?? 0,
    },
  });
}

export async function bootstrapProduct(input: {
  tenantId: string;
  name: string;
  slug?: string;
  description?: string;
}): Promise<TenantProduct> {
  const building = await countBuildingProducts(input.tenantId);
  if (building >= MAX_BUILDING_PRODUCTS) {
    throw new Error(`Maximum ${MAX_BUILDING_PRODUCTS} products in Building/Launching phase`);
  }

  const slug = input.slug ?? slugifyProductName(input.name);
  if (!slug) throw new Error("Invalid product slug");

  await bootstrapProductWorkspace(slug, input.name, input.description);

  const product = await upsertTenantProduct({
    tenantId: input.tenantId,
    slug,
    name: input.name,
    description: input.description,
    phase: "building",
    goNoGo: "go",
  });
  await ensureProductConsensus(product.id);
  return product;
}

export async function registerExistingProduct(input: {
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  phase?: ProductPhase;
  githubRepoUrl?: string;
  intakeStatus?: import("@prisma/client").ProductIntakeStatus;
}): Promise<{
  product: TenantProduct;
  hasExistingCode: boolean;
  workspacePath: string;
}> {
  const slug = input.slug.trim().toLowerCase();
  if (!slug || !/^[a-z0-9][a-z0-9_-]*$/.test(slug)) {
    throw new Error("Invalid product slug");
  }

  await ensureProductWorkspace(slug);

  const product = await upsertTenantProduct({
    tenantId: input.tenantId,
    slug,
    name: input.name.trim(),
    description: input.description?.trim(),
    phase: input.phase ?? "building",
    goNoGo: "go",
  });

  if (input.githubRepoUrl || input.intakeStatus) {
    await prisma.tenantProduct.update({
      where: { id: product.id },
      data: {
        ...(input.githubRepoUrl ? { githubRepoUrl: input.githubRepoUrl.trim() } : {}),
        ...(input.intakeStatus ? { intakeStatus: input.intakeStatus } : {}),
      },
    });
  }

  await ensureProductConsensus(product.id);
  if (input.description?.trim()) {
    const { buildInitialConsensusWithDescription } = await import("./product-intake.js");
    await prisma.productConsensus.update({
      where: { productId: product.id },
      data: { content: buildInitialConsensusWithDescription(input.name.trim(), input.description) },
    });
  }

  const { syncProductConsensusToWorkspace } = await import("./product-consensus.js");
  await syncProductConsensusToWorkspace(product.id, slug);

  const refreshed = await prisma.tenantProduct.findUniqueOrThrow({ where: { id: product.id } });

  const root = resolveProductWorkspaceRoot(slug);
  let hasExistingCode = false;
  try {
    const entries = await readdir(root);
    hasExistingCode = entries.some((entry) => entry !== ".git");
  } catch {
    hasExistingCode = false;
  }

  return {
    product: refreshed,
    hasExistingCode,
    workspacePath: `projects/${slug}/`,
  };
}

export async function listImportableWorkspaces(tenantId: string): Promise<
  Array<{ slug: string; path: string; hasCode: boolean }>
> {
  const base = join(resolve(process.env.WORKSPACE_ROOT ?? process.cwd()), "projects");
  const registered = await listTenantProducts(tenantId);
  const registeredSlugs = new Set(registered.map((p) => p.slug));

  let dirs: string[] = [];
  try {
    const entries = await readdir(base, { withFileTypes: true });
    dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }

  const results: Array<{ slug: string; path: string; hasCode: boolean }> = [];
  for (const slug of dirs.sort()) {
    if (registeredSlugs.has(slug)) continue;
    const root = join(base, slug);
    let hasCode = false;
    try {
      const entries = await readdir(root);
      hasCode = entries.some((e) => e !== ".git");
    } catch {
      hasCode = false;
    }
    results.push({ slug, path: `projects/${slug}/`, hasCode });
  }
  return results;
}

export async function listPipelineIdeas(tenantId: string) {
  return prisma.pipelineIdea.findMany({
    where: { tenantId, goNoGo: { in: ["pending", "go"] } },
    orderBy: [
      { interestScore: "desc" },
      { rank: "asc" },
      { createdAt: "asc" },
    ],
  });
}

export async function addPipelineIdeas(
  tenantId: string,
  ideas: Array<{ title: string; description?: string; interestScore?: number }>,
): Promise<Awaited<ReturnType<typeof prisma.pipelineIdea.create>>[]> {
  const [products, existing] = await Promise.all([
    listTenantProducts(tenantId),
    prisma.pipelineIdea.findMany({
      where: { tenantId, goNoGo: { in: ["pending", "go"] } },
      select: { title: true },
    }),
  ]);

  const { filterNewPipelineIdeas } = await import("./pipeline-utils.js");
  const novel = filterNewPipelineIdeas(
    ideas,
    existing.map((row) => row.title),
    products,
  );
  if (novel.length === 0) return [];

  const rankBase = await prisma.pipelineIdea.count({ where: { tenantId } });
  const created = [];
  for (let i = 0; i < novel.length; i++) {
    const idea = novel[i];
    created.push(
      await prisma.pipelineIdea.create({
        data: {
          tenantId,
          title: idea.title.trim(),
          description: idea.description,
          rank: rankBase + i,
          interestScore: idea.interestScore ?? 0,
        },
      }),
    );
  }

  if (created.length > 0) {
    const { autoEvaluatePipelineIdeaIfNeeded } = await import("./pipeline-idea-evaluation.js");
    for (const row of created) {
      void autoEvaluatePipelineIdeaIfNeeded(tenantId, row.id).catch(() => undefined);
    }
  }

  return created;
}

export async function markIdeaGoNoGo(ideaId: string, decision: GoNoGoDecision) {
  return prisma.pipelineIdea.update({
    where: { id: ideaId },
    data: { goNoGo: decision },
  });
}

export async function deletePipelineIdea(tenantId: string, ideaId: string) {
  const idea = await prisma.pipelineIdea.findFirst({
    where: { id: ideaId, tenantId },
  });
  if (!idea) throw new Error("Pipeline idea not found");
  await prisma.pipelineIdea.delete({ where: { id: ideaId } });
}

export async function cancelTenantProduct(tenantId: string, productId: string) {
  const product = await prisma.tenantProduct.findFirst({
    where: { id: productId, tenantId },
  });
  if (!product) throw new Error("Product not found");

  const updated = await prisma.tenantProduct.update({
    where: { id: productId },
    data: { phase: "archived", goNoGo: "no_go" },
  });

  const cycle = await prisma.tenantCycleState.findUnique({ where: { tenantId } });
  if (cycle?.focusProductId === productId) {
    await prisma.tenantCycleState.update({
      where: { tenantId },
      data: { focusProductId: null },
    });
  }

  return updated;
}

export async function deleteTenantProduct(tenantId: string, productId: string) {
  const product = await prisma.tenantProduct.findFirst({
    where: { id: productId, tenantId },
  });
  if (!product) throw new Error("Product not found");

  const cycle = await prisma.tenantCycleState.findUnique({ where: { tenantId } });
  if (cycle?.focusProductId === productId) {
    await prisma.tenantCycleState.update({
      where: { tenantId },
      data: { focusProductId: null },
    });
  }

  await prisma.tenantProduct.delete({ where: { id: productId } });
}

export async function ensureDefaultProducts(tenantId: string, tenantSlug: string) {
  const snapog = await getProductBySlug(tenantId, "snapog");
  if (!snapog && tenantSlug === "snapog") {
    await upsertTenantProduct({
      tenantId,
      slug: "snapog",
      name: "SnapOG",
      description: "Open Graph image API on Cloudflare Workers",
      phase: "growing",
      goNoGo: "go",
    });
  }
}

export async function setFocusProduct(tenantId: string, productId: string | null) {
  await ensureTenantCycleState(tenantId);
  return prisma.tenantCycleState.update({
    where: { tenantId },
    data: { focusProductId: productId },
  });
}

export async function updateCompanyPhase(tenantId: string, phase: CompanyPhase) {
  await prisma.tenantConsensus.upsert({
    where: { tenantId },
    update: { companyPhase: phase },
    create: {
      tenantId,
      content: "# Consensus\n\nAutonomous company memory.",
      companyPhase: phase,
      nextAction: "Run opportunity discovery",
    },
  });
  await ensureTenantCycleState(tenantId);
  return prisma.tenantCycleState.update({
    where: { tenantId },
    data: { phase },
  });
}

export async function recordProductRun(productId: string, runId: string) {
  return prisma.tenantProduct.update({
    where: { id: productId },
    data: { lastRunId: runId },
  });
}
