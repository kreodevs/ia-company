import { prisma } from "./prisma.js";
import { createDeskItem } from "./product-desk.js";
import { getProductSignalSummary } from "./product-signals.js";
import { getPlaybookById } from "./product-playbooks.js";

export interface DeskRecommendation {
  playbookId: string;
  title: string;
  previewText: string;
  reason: string;
}

function recommendationExists(
  existingTitles: Set<string>,
  playbookId: string,
): boolean {
  return existingTitles.has(`rec:${playbookId}`);
}

export async function computeProductRecommendations(
  tenantId: string,
  productId: string,
): Promise<DeskRecommendation[]> {
  const summary = await getProductSignalSummary(tenantId, productId);
  const product = await prisma.tenantProduct.findFirst({
    where: { id: productId, tenantId },
    select: { name: true, phase: true, revenueUsd: true },
  });
  if (!product) return [];

  const out: DeskRecommendation[] = [];

  if (summary.revenueUsd <= 0 && summary.daysSinceLastRevenue !== null && summary.daysSinceLastRevenue >= 14) {
    out.push({
      playbookId: "pricing-review",
      title: "Consider pricing review",
      previewText: `No revenue recorded in ${summary.daysSinceLastRevenue} days. CFO can propose tiers and experiments.`,
      reason: "revenue_stalled",
    });
  }

  if (summary.waitlistSignups30d >= 10 && product.phase === "launching") {
    out.push({
      playbookId: "adapt-creative",
      title: "Scale launch marketing",
      previewText: `${summary.waitlistSignups30d} waitlist signups in 30 days — refresh campaign creative.`,
      reason: "waitlist_growth",
    });
  }

  if (summary.campaignSignals30d > 0) {
    out.push({
      playbookId: "adapt-creative",
      title: "Adapt campaign from latest metrics",
      previewText: "New campaign metrics arrived — marketing can iterate copy and design.",
      reason: "campaign_metrics",
    });
  }

  if (
    product.phase === "growing" &&
    summary.revenueUsd <= 0 &&
    summary.daysSinceLastRevenue !== null &&
    summary.daysSinceLastRevenue >= 60 &&
    summary.pricingCyclesWithoutRevenue >= 2
  ) {
    out.push({
      playbookId: "sunset-review",
      title: "Sunset review recommended",
      previewText:
        "Monetization options may be exhausted. Run sunset review — human decides archive.",
      reason: "sunset_candidate",
    });
  }

  if (product.phase === "building" || product.phase === "launching") {
    out.push({
      playbookId: "seo-audit",
      title: "SEO audit before launch",
      previewText: "Ship landing SEO fixes while the product is still pre-scale.",
      reason: "pre_launch_seo",
    });
  }

  return out.slice(0, 5);
}

export async function syncRecommendationsToDesk(input: {
  tenantId: string;
  productId: string;
}): Promise<number> {
  const recs = await computeProductRecommendations(input.tenantId, input.productId);
  if (recs.length === 0) return 0;

  const existing = await prisma.productDeskItem.findMany({
    where: {
      tenantId: input.tenantId,
      productId: input.productId,
      sourceKind: "recommendation",
      status: { in: ["draft", "approved"] },
    },
    select: { title: true, sourceMeta: true },
  });

  const existingKeys = new Set(
    existing.map((row) => {
      const meta = row.sourceMeta as Record<string, unknown>;
      const pid = typeof meta.playbookId === "string" ? meta.playbookId : "";
      return pid ? `rec:${pid}` : row.title;
    }),
  );

  let created = 0;
  for (const rec of recs) {
    if (recommendationExists(existingKeys, rec.playbookId)) continue;
    const playbook = getPlaybookById(rec.playbookId);
    await createDeskItem({
      tenantId: input.tenantId,
      productId: input.productId,
      type: "task",
      title: rec.title,
      previewText: rec.previewText,
      body: { reason: rec.reason, playbookId: rec.playbookId, playbookLabel: playbook?.label },
      sourceKind: "recommendation",
      sourceMeta: { playbookId: rec.playbookId, reason: rec.reason },
      playbookId: rec.playbookId,
      suggestedNextRole: null,
      status: "draft",
    });
    existingKeys.add(`rec:${rec.playbookId}`);
    created += 1;
  }

  return created;
}
