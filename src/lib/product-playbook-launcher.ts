import { prisma } from "./prisma.js";
import { launchProductWork } from "./product-work-launcher.js";
import { getPlaybookById, playbooksForOrgType } from "./product-playbooks.js";
import { attachScopeContract, buildProductScopeContract } from "./scope-contract.js";
import { syncRecommendationsToDesk } from "./product-desk-recommender.js";
import { createTenantNotification } from "./tenant-notifications.js";

export async function launchProductPlaybook(input: {
  tenantId: string;
  productId: string;
  playbookId: string;
}): Promise<{ runId: string; workflowName: string }> {
  const playbook = getPlaybookById(input.playbookId);
  if (!playbook) throw new Error("Playbook not found");

  const product = await prisma.tenantProduct.findFirst({
    where: { id: input.productId, tenantId: input.tenantId },
    select: { id: true, slug: true, name: true, orgUnitId: true },
  });
  if (!product) throw new Error("Product not found");

  const task = playbook.taskTemplate.replace(/this product/gi, product.name);

  const scope = buildProductScopeContract({
    productId: product.id,
    productSlug: product.slug,
    orgUnitId: product.orgUnitId,
    intent: playbook.id === "sunset-review" ? "review" : "deliver",
  });

  const { runId, workflowName } = await launchProductWork(input.tenantId, product.id, {
    presetId: playbook.presetId,
    task,
    mergeConsensus: true,
    setFocus: true,
    orgContext: attachScopeContract({ playbookId: playbook.id }, scope),
  });

  if (playbook.id === "pricing-review") {
    const meta = await prisma.tenantProduct.findUnique({
      where: { id: product.id },
      select: { metadata: true },
    });
    const base =
      meta?.metadata && typeof meta.metadata === "object"
        ? (meta.metadata as Record<string, unknown>)
        : {};
    const prev =
      typeof base.pricingCyclesWithoutRevenue === "number" ? base.pricingCyclesWithoutRevenue : 0;
    await prisma.tenantProduct.update({
      where: { id: product.id },
      data: {
        metadata: { ...base, pricingCyclesWithoutRevenue: prev + 1 } as object,
      },
    });
  }

  return { runId, workflowName };
}

export async function listPlaybooksForProduct(
  tenantId: string,
  productId: string,
): Promise<ReturnType<typeof playbooksForOrgType>> {
  const product = await prisma.tenantProduct.findFirst({
    where: { id: productId, tenantId },
    select: { orgUnit: { select: { type: true } } },
  });
  return playbooksForOrgType(product?.orgUnit?.type);
}

export async function suggestMetaOrchestratorRun(input: {
  tenantId: string;
  workflowName: string;
  productId?: string;
  productSlug?: string;
  reason: string;
}): Promise<{ notificationId: string }> {
  const href = input.productId
    ? `/products/${input.productId}/desk`
    : "/office";

  const notification = await createTenantNotification({
    tenantId: input.tenantId,
    type: "playbook_suggestion",
    title: `Suggested: ${input.workflowName}`,
    body: input.reason,
    href,
  });

  if (input.productId) {
    await syncRecommendationsToDesk({ tenantId: input.tenantId, productId: input.productId });
  }

  return { notificationId: notification.id };
}
