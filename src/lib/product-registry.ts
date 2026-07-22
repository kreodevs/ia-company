import type { CompanyPhase, GoNoGoDecision, ProductPhase, TenantProduct } from "@prisma/client";
import { prisma } from "./prisma.js";
import { bootstrapProductWorkspace, slugifyProductName } from "./product-workspace.js";
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

  return upsertTenantProduct({
    tenantId: input.tenantId,
    slug,
    name: input.name,
    description: input.description,
    phase: "building",
    goNoGo: "go",
  });
}

export async function listPipelineIdeas(tenantId: string) {
  return prisma.pipelineIdea.findMany({
    where: { tenantId, goNoGo: { in: ["pending", "go"] } },
    orderBy: [{ rank: "asc" }, { createdAt: "asc" }],
  });
}

export async function addPipelineIdeas(
  tenantId: string,
  ideas: Array<{ title: string; description?: string }>,
) {
  const existing = await prisma.pipelineIdea.count({ where: { tenantId } });
  const created = [];
  for (let i = 0; i < ideas.length; i++) {
    const idea = ideas[i];
    created.push(
      await prisma.pipelineIdea.create({
        data: {
          tenantId,
          title: idea.title,
          description: idea.description,
          rank: existing + i,
        },
      }),
    );
  }
  return created;
}

export async function markIdeaGoNoGo(ideaId: string, decision: GoNoGoDecision) {
  return prisma.pipelineIdea.update({
    where: { id: ideaId },
    data: { goNoGo: decision },
  });
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
