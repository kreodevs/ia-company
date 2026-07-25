import { prisma } from "./prisma.js";
import { buildDeskInputBrief, markDeskItemsInProgress } from "./product-desk.js";
import { launchProductWork } from "./product-work-launcher.js";
import { attachScopeContract, buildProductScopeContract } from "./scope-contract.js";
import { agentAcceptsInput, humanLabelForDeskType } from "./agent-contract.js";
import type { DeskItemDto } from "./product-desk.js";
import { getProductDeskBoard } from "./product-desk.js";

async function loadApprovedDeskItem(input: {
  tenantId: string;
  productId: string;
  deskItemId: string;
}): Promise<DeskItemDto> {
  const board = await getProductDeskBoard(input.tenantId, input.productId);
  const all = [...board.ready, ...board.inProgress];
  const hit = all.find((i) => i.id === input.deskItemId);
  if (hit) return hit;

  const row = await prisma.productDeskItem.findFirst({
    where: {
      id: input.deskItemId,
      productId: input.productId,
      tenantId: input.tenantId,
      status: "approved",
    },
  });
  if (!row) throw new Error("Approved desk item not found");

  return {
    id: row.id,
    productId: row.productId,
    type: row.type,
    status: row.status,
    title: row.title,
    previewText: row.previewText,
    body: (row.body ?? {}) as Record<string, unknown>,
    sourceKind: row.sourceKind,
    sourceMeta: (row.sourceMeta ?? {}) as Record<string, unknown>,
    runId: row.runId,
    createdByAgent: row.createdByAgent,
    suggestedNextRole: row.suggestedNextRole,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    humanTypeLabel: humanLabelForDeskType(row.type),
    playbookId: row.playbookId ?? null,
    kanbanColumn: row.kanbanColumn ?? null,
    eligibleAgents: [],
  };
}

type DispatchAgent = { id: string; name: string };

export async function launchProductWorkFromDesk(input: {
  tenantId: string;
  productId: string;
  deskItemId: string;
  agentId?: string;
}): Promise<{ runId: string; workflowId: string; workflowName: string; agentName: string }> {
  const product = await prisma.tenantProduct.findFirst({
    where: { id: input.productId, tenantId: input.tenantId },
    select: { id: true, slug: true, name: true, orgUnitId: true },
  });
  if (!product) throw new Error("Product not found");

  const deskItem = await loadApprovedDeskItem(input);
  if (deskItem.status !== "approved") {
    throw new Error("Desk item must be approved before dispatch");
  }

  let agent: DispatchAgent | null = input.agentId
    ? await prisma.agent.findFirst({
        where: { id: input.agentId, tenantId: input.tenantId, isActive: true },
        select: { id: true, name: true },
      })
    : null;

  if (!agent && deskItem.suggestedNextRole) {
    agent = await prisma.agent.findFirst({
      where: {
        tenantId: input.tenantId,
        name: deskItem.suggestedNextRole,
        isActive: true,
      },
      select: { id: true, name: true },
    });
  }

  if (!agent) {
    const candidates = await prisma.agent.findMany({
      where: { tenantId: input.tenantId, isActive: true },
      select: { id: true, name: true, contractInputs: true },
    });
    agent =
      candidates.find((a) => agentAcceptsInput(a.contractInputs, deskItem.type)) ?? null;
  }

  if (!agent) {
    throw new Error("No agent accepts this desk item type");
  }

  const brief = buildDeskInputBrief([deskItem]);
  const task = `Consume approved desk input and produce the appropriate output for ${product.name}.\n\n${brief}`;

  const scope = buildProductScopeContract({
    productId: product.id,
    productSlug: product.slug,
    orgUnitId: product.orgUnitId,
    intent: "deliver",
  });

  const { runId, workflowId, workflowName } = await launchProductWork(
    input.tenantId,
    product.id,
    {
      agentId: agent.id,
      task,
      mergeConsensus: true,
      setFocus: true,
      orgContext: attachScopeContract(
        {
          deskInputRefs: [{ deskItemId: deskItem.id, type: deskItem.type, title: deskItem.title }],
        },
        scope,
      ),
    },
  );

  await markDeskItemsInProgress({ deskItemIds: [deskItem.id], runId });

  return { runId, workflowId, workflowName, agentName: agent.name };
}
