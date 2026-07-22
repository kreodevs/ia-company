import { prisma } from "./prisma.js";
import { normalizeOpencodeDiff } from "./opencode-diff.js";

export async function listProductOpencodeHistory(tenantId: string, productId: string, limit = 20) {
  const product = await prisma.tenantProduct.findFirst({
    where: { id: productId, tenantId },
    select: { id: true, slug: true, name: true },
  });
  if (!product) return null;

  const delegations = await prisma.opencodeDelegation.findMany({
    where: { tenantId, productId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      run: {
        select: {
          id: true,
          status: true,
          workflow: { select: { name: true } },
          completedAt: true,
        },
      },
    },
  });

  return {
    product,
    delegations: delegations.map((d) => ({
      id: d.id,
      runId: d.runId,
      runStatus: d.run.status,
      workflowName: d.run.workflow.name,
      opencodeSessionId: d.opencodeSessionId,
      status: d.status,
      promptSummary: d.promptSummary,
      resultSummary: d.resultSummary,
      errorMessage: d.errorMessage,
      diffCount: normalizeOpencodeDiff(d.diffJson).length,
      startedAt: d.startedAt,
      completedAt: d.completedAt,
      createdAt: d.createdAt,
    })),
  };
}

export async function getActiveOpencodeByProduct(tenantId: string) {
  const active = await prisma.opencodeDelegation.findMany({
    where: {
      tenantId,
      status: { in: ["PENDING", "RUNNING"] },
      productId: { not: null },
    },
    select: {
      id: true,
      productId: true,
      runId: true,
      opencodeSessionId: true,
      status: true,
      run: { select: { status: true } },
    },
  });

  const map: Record<
    string,
    { delegationId: string; runId: string; sessionId: string; status: string; runStatus: string }
  > = {};

  for (const row of active) {
    if (!row.productId) continue;
    map[row.productId] = {
      delegationId: row.id,
      runId: row.runId,
      sessionId: row.opencodeSessionId,
      status: row.status,
      runStatus: row.run.status,
    };
  }

  return map;
}

export async function getLatestCompletedDelegationForProduct(tenantId: string, productId: string) {
  return prisma.opencodeDelegation.findFirst({
    where: { tenantId, productId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });
}
