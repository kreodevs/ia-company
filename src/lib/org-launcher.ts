import { prisma } from "./prisma.js";
import { executeWorkflowInBackground } from "../core/engine.js";
import { assertTenantCanExecute } from "./usage-limits.js";
import { recordProductRun } from "./product-registry.js";
import { ensureTeamTaskWorkflow } from "../server/lib/clone-templates.js";
import { launchProductWork } from "./product-work-launcher.js";
import { loadOrgUnitContext, orgContextToInitialMemory } from "./org-context.js";
import { presetForOrgWorkItem } from "./org-work-item.js";
import { serializeTenantProductForClient } from "./product-serializer.js";

function cyclePresetForMarketing(orgSlug: string, workItemKind: import("@prisma/client").WorkItemKind): string {
  let h = 0;
  for (let i = 0; i < orgSlug.length; i++) h = (h * 31 + orgSlug.charCodeAt(i)) >>> 0;
  return presetForOrgWorkItem(workItemKind, "marketing_agency", h);
}

export async function listOrgUnitProducts(tenantId: string, orgUnitId: string) {
  const rows = await prisma.tenantProduct.findMany({
    where: { tenantId, orgUnitId, phase: { not: "archived" } },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(serializeTenantProductForClient);
}

export async function launchOrgUnitWork(
  tenantId: string,
  orgUnitId: string,
  input: { task: string; productId?: string; presetId?: string },
): Promise<{ runId: string; workflowId: string; workflowName: string; productId: string | null }> {
  const orgCtx = await loadOrgUnitContext(tenantId, orgUnitId);
  if (!orgCtx) throw new Error("Org unit not found");

  const task = input.task.trim();
  if (!task) throw new Error("Task is required");

  await assertTenantCanExecute(tenantId);

  let productId = input.productId;
  if (!productId) {
    const linked = await prisma.tenantProduct.findFirst({
      where: { tenantId, orgUnitId, phase: { not: "archived" } },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    productId = linked?.id;
  }

  const orgMemory = orgContextToInitialMemory(orgCtx);

  if (input.presetId) {
    if (!productId) {
      throw new Error(
        "Link a product to this department first (Product settings → Department), or pass productId.",
      );
    }
    const result = await launchProductWork(tenantId, productId, {
      presetId: input.presetId,
      task,
      mergeConsensus: true,
      setFocus: true,
      orgContext: orgMemory,
    });
    return { ...result, productId };
  }

  if (orgCtx.orgUnitType === "marketing_agency" && productId) {
    const product = await prisma.tenantProduct.findFirst({
      where: { id: productId, tenantId },
      select: { workItemKind: true },
    });
    const presetId = cyclePresetForMarketing(
      orgCtx.orgUnitSlug,
      product?.workItemKind ?? "client",
    );
    const result = await launchProductWork(tenantId, productId, {
      presetId,
      task,
      mergeConsensus: true,
      setFocus: true,
      orgContext: orgMemory,
    });
    return { ...result, productId };
  }

  const agents = await prisma.agent.findMany({
    where: {
      tenantId,
      isActive: true,
      name: { in: orgCtx.suggestedAgentNames },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (agents.length === 0) {
    throw new Error("No department agents found. Re-apply Org Studio or add agents manually.");
  }

  const teamWf = await ensureTeamTaskWorkflow(
    tenantId,
    agents.map((a) => a.id),
    task.slice(0, 80),
  );
  if (!teamWf) throw new Error("Could not assemble team workflow");

  const product = productId
    ? await prisma.tenantProduct.findFirst({
        where: { id: productId, tenantId },
        select: { id: true, slug: true },
      })
    : null;

  const runId = await executeWorkflowInBackground(teamWf.id, {
    tenantId,
    productId: product?.id,
    productSlug: product?.slug,
    workflowName: teamWf.name,
    mergeConsensus: true,
    syncConsensus: true,
    initialMemory: {
      task,
      nextAction: task,
      officeRequest: task,
      orgUnitRequest: task,
      teamAgents: agents.map((a) => a.name),
      ...orgMemory,
      ...(product
        ? { focusProductSlug: product.slug, productId: product.id, focusProductName: product.slug }
        : {}),
    },
  });

  if (product) await recordProductRun(product.id, runId);

  return {
    runId,
    workflowId: teamWf.id,
    workflowName: teamWf.name,
    productId: product?.id ?? null,
  };
}
