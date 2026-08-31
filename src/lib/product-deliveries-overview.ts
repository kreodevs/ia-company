import { prisma } from "./prisma.js";
import { getProductDeskBoard, type DeskItemDto } from "./product-desk.js";
import { listOfficeEncargos, type OfficeEncargoSummary } from "./office-encargos.js";

export type ProductDeliveriesAttentionKind =
  | "decision"
  | "failed"
  | "opencode"
  | "desk";

export interface ProductDeliveriesAttentionItem {
  kind: ProductDeliveriesAttentionKind;
  title: string;
  subtitle: string | null;
  runId: string | null;
  deskItemId: string | null;
  decisionProposalId: string | null;
}

export interface ProductDeliveriesOverview {
  product: {
    id: string;
    name: string;
    slug: string;
    phase: string;
  };
  stats: {
    total: number;
    inProgress: number;
    delivered: number;
    failed: number;
    attentionCount: number;
  };
  attention: ProductDeliveriesAttentionItem[];
  inProgress: OfficeEncargoSummary[];
  delivered: OfficeEncargoSummary[];
  failed: OfficeEncargoSummary[];
  deskForYou: DeskItemDto[];
}

const OPENCODE_ATTENTION_STATUSES = new Set(["AWAITING_USER", "DELEGATED"]);

export async function getProductDeliveriesOverview(
  tenantId: string,
  productId: string,
): Promise<ProductDeliveriesOverview | null> {
  const product = await prisma.tenantProduct.findFirst({
    where: { id: productId, tenantId },
    select: { id: true, name: true, slug: true, phase: true },
  });
  if (!product) return null;

  const [{ items: encargos }, deskBoard] = await Promise.all([
    listOfficeEncargos(tenantId, { productId, limit: 100 }),
    getProductDeskBoard(tenantId, productId),
  ]);

  const inProgress = encargos.filter(
    (item) => item.phase === "queued" || item.phase === "in_progress",
  );
  const delivered = encargos.filter((item) => item.phase === "delivered");
  const failed = encargos.filter((item) => item.phase === "failed");
  const deskForYou = deskBoard.forYou;

  const runIds = encargos.map((item) => item.id);
  const pendingProposals =
    runIds.length > 0
      ? await prisma.decisionProposal.findMany({
          where: {
            tenantId,
            runId: { in: runIds },
            status: { in: ["pending_review", "drilling"] },
          },
          include: { idea: { select: { title: true } } },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const attention: ProductDeliveriesAttentionItem[] = [];

  for (const proposal of pendingProposals) {
    const encargo = encargos.find((item) => item.id === proposal.runId);
    attention.push({
      kind: "decision",
      title: proposal.idea?.title ?? encargo?.title ?? "Decisión pendiente",
      subtitle: encargo?.procedureLabel ?? null,
      runId: proposal.runId,
      deskItemId: null,
      decisionProposalId: proposal.id,
    });
  }

  for (const item of failed) {
    attention.push({
      kind: "failed",
      title: item.title,
      subtitle: item.procedureLabel,
      runId: item.id,
      deskItemId: null,
      decisionProposalId: null,
    });
  }

  for (const item of inProgress) {
    if (!OPENCODE_ATTENTION_STATUSES.has(item.status)) continue;
    attention.push({
      kind: "opencode",
      title: item.title,
      subtitle: item.status === "AWAITING_USER" ? "opencode_awaiting" : "opencode_delegated",
      runId: item.id,
      deskItemId: null,
      decisionProposalId: null,
    });
  }

  for (const deskItem of deskForYou) {
    attention.push({
      kind: "desk",
      title: deskItem.title,
      subtitle: deskItem.humanTypeLabel,
      runId: deskItem.runId,
      deskItemId: deskItem.id,
      decisionProposalId: null,
    });
  }

  return {
    product,
    stats: {
      total: encargos.length,
      inProgress: inProgress.length,
      delivered: delivered.length,
      failed: failed.length,
      attentionCount: attention.length,
    },
    attention,
    inProgress,
    delivered,
    failed,
    deskForYou,
  };
}
