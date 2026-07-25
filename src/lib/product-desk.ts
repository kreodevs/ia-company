import type {
  DeskItemSourceKind,
  DeskItemStatus,
  DeskItemType,
  KanbanColumn,
  Prisma,
} from "@prisma/client";
import { prisma } from "./prisma.js";
import {
  agentAcceptsInput,
  humanLabelForDeskType,
  suggestNextRoleForType,
} from "./agent-contract.js";
import { extractHandoffFromAgentOutput } from "./product-consensus.js";
import type { SharedMemory } from "../types/index.js";
import { asString } from "./structured-memory.js";

export type DeskZone = "for_you" | "ready" | "in_progress" | "recent";

export interface DeskItemDto {
  id: string;
  productId: string;
  type: DeskItemType;
  status: DeskItemStatus;
  title: string;
  previewText: string | null;
  body: Record<string, unknown>;
  sourceKind: DeskItemSourceKind;
  sourceMeta: Record<string, unknown>;
  runId: string | null;
  createdByAgent: string | null;
  suggestedNextRole: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  humanTypeLabel: string;
  playbookId: string | null;
  kanbanColumn: string | null;
  eligibleAgents: Array<{ id: string; name: string; role: string }>;
}

function serializeDeskItem(
  row: {
    id: string;
    productId: string;
    type: DeskItemType;
    status: DeskItemStatus;
    title: string;
    previewText: string | null;
    body: unknown;
    sourceKind: DeskItemSourceKind;
    sourceMeta: unknown;
    runId: string | null;
    createdByAgent: string | null;
    suggestedNextRole: string | null;
    approvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    playbookId?: string | null;
    kanbanColumn?: string | null;
  },
  eligibleAgents: DeskItemDto["eligibleAgents"] = [],
): DeskItemDto {
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
    eligibleAgents,
  };
}

const AGENT_TYPE_HINTS: Array<{ pattern: RegExp; type: DeskItemType }> = [
  { pattern: /fullstack|dhh|opencode|dev/i, type: "code" },
  { pattern: /product-norman|interaction-cooper/i, type: "spec" },
  { pattern: /cto-vogels/i, type: "adr" },
  { pattern: /ui-duarte|design-lead/i, type: "design" },
  { pattern: /copy-manager|marketing-godin|content-editor|sdr-outbound/i, type: "copy" },
  { pattern: /community-manager/i, type: "social_post" },
  { pattern: /qa-bach/i, type: "report" },
  { pattern: /research-thompson|seo-strategist|pricing-analyst|cfo-campbell|sales-ross|operations-pg|ceo-bezos/i, type: "report" },
];

export function inferDeskItemType(agentName: string, content: string): DeskItemType {
  for (const hint of AGENT_TYPE_HINTS) {
    if (hint.pattern.test(agentName)) return hint.type;
  }
  const lower = content.toLowerCase();
  if (/\b(acceptance criteria|user story|feature spec)\b/.test(lower)) return "spec";
  if (/\b(architecture decision|adr)\b/.test(lower)) return "adr";
  if (/\b(implemented|pull request|```)/.test(lower)) return "code";
  if (/\b(hashtag|instagram|linkedin post|tweet)\b/.test(lower)) return "social_post";
  return "report";
}

function kanbanForStatus(status: DeskItemStatus): KanbanColumn | null {
  switch (status) {
    case "draft":
      return "backlog";
    case "approved":
      return "approved";
    case "in_progress":
      return "in_progress";
    case "consumed":
      return "done";
    default:
      return null;
  }
}

function truncatePreview(text: string, max = 400): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export async function listEligibleAgentsForDeskItem(
  tenantId: string,
  itemType: string,
): Promise<Array<{ id: string; name: string; role: string }>> {
  const agents = await prisma.agent.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, role: true, contractInputs: true },
    orderBy: { name: "asc" },
  });
  return agents
    .filter((a) => agentAcceptsInput(a.contractInputs, itemType))
    .map((a) => ({ id: a.id, name: a.name, role: a.role }));
}

export async function createDeskItem(input: {
  tenantId: string;
  productId: string;
  type: DeskItemType;
  title: string;
  previewText?: string | null;
  body?: Record<string, unknown>;
  sourceKind?: DeskItemSourceKind;
  sourceMeta?: Record<string, unknown>;
  runId?: string | null;
  createdByAgent?: string | null;
  suggestedNextRole?: string | null;
  playbookId?: string | null;
  status?: DeskItemStatus;
}): Promise<DeskItemDto> {
  const row = await prisma.productDeskItem.create({
    data: {
      tenantId: input.tenantId,
      productId: input.productId,
      type: input.type,
      status: input.status ?? "draft",
      title: input.title.slice(0, 240),
      previewText: input.previewText?.slice(0, 4000) ?? null,
      body: (input.body ?? {}) as Prisma.InputJsonValue,
      sourceKind: input.sourceKind ?? "run",
      sourceMeta: (input.sourceMeta ?? {}) as Prisma.InputJsonValue,
      runId: input.runId ?? null,
      createdByAgent: input.createdByAgent ?? null,
      suggestedNextRole: input.suggestedNextRole ?? suggestNextRoleForType(input.type),
      playbookId: input.playbookId ?? (typeof input.sourceMeta?.playbookId === "string" ? input.sourceMeta.playbookId : null),
      kanbanColumn: kanbanForStatus(input.status ?? "draft"),
    },
  });
  const eligible =
    row.status === "approved"
      ? await listEligibleAgentsForDeskItem(input.tenantId, row.type)
      : [];
  return serializeDeskItem(row, eligible);
}

export async function getProductDeskBoard(
  tenantId: string,
  productId: string,
): Promise<{
  forYou: DeskItemDto[];
  ready: DeskItemDto[];
  inProgress: DeskItemDto[];
  recent: DeskItemDto[];
}> {
  const product = await prisma.tenantProduct.findFirst({
    where: { id: productId, tenantId },
    select: { id: true },
  });
  if (!product) throw new Error("Product not found");

  const [forYouRows, readyRows, inProgressRows, recentRows] = await Promise.all([
    prisma.productDeskItem.findMany({
      where: { productId, status: "draft" },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.productDeskItem.findMany({
      where: { productId, status: "approved" },
      orderBy: { approvedAt: "desc" },
      take: 50,
    }),
    prisma.productDeskItem.findMany({
      where: { productId, status: "in_progress" },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.productDeskItem.findMany({
      where: {
        productId,
        status: { in: ["consumed", "archived"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);

  const enrich = async (rows: typeof forYouRows): Promise<DeskItemDto[]> =>
    Promise.all(
      rows.map(async (row) => {
        const eligible =
          row.status === "approved"
            ? await listEligibleAgentsForDeskItem(tenantId, row.type)
            : [];
        return serializeDeskItem(row, eligible);
      }),
    );

  return {
    forYou: await enrich(forYouRows),
    ready: await enrich(readyRows),
    inProgress: await enrich(inProgressRows),
    recent: recentRows.map((row) => serializeDeskItem(row)),
  };
}

export async function approveDeskItem(input: {
  tenantId: string;
  productId: string;
  deskItemId: string;
  userId?: string | null;
}): Promise<DeskItemDto> {
  const row = await prisma.productDeskItem.findFirst({
    where: { id: input.deskItemId, productId: input.productId, tenantId: input.tenantId },
  });
  if (!row) throw new Error("Desk item not found");
  if (row.status !== "draft") throw new Error("Only draft items can be approved");

  const updated = await prisma.productDeskItem.update({
    where: { id: row.id },
    data: {
      status: "approved",
      approvedAt: new Date(),
      approvedByUserId: input.userId ?? null,
      kanbanColumn: "approved",
    },
  });
  const eligible = await listEligibleAgentsForDeskItem(input.tenantId, updated.type);
  return serializeDeskItem(updated, eligible);
}

export async function archiveDeskItem(input: {
  tenantId: string;
  productId: string;
  deskItemId: string;
}): Promise<DeskItemDto> {
  const row = await prisma.productDeskItem.findFirst({
    where: { id: input.deskItemId, productId: input.productId, tenantId: input.tenantId },
  });
  if (!row) throw new Error("Desk item not found");

  const updated = await prisma.productDeskItem.update({
    where: { id: row.id },
    data: { status: "archived", kanbanColumn: "done" },
  });
  return serializeDeskItem(updated);
}

export async function markDeskItemsInProgress(input: {
  deskItemIds: string[];
  runId: string;
}): Promise<void> {
  if (input.deskItemIds.length === 0) return;
  await prisma.productDeskItem.updateMany({
    where: { id: { in: input.deskItemIds }, status: "approved" },
    data: { status: "in_progress", consumedByRunId: input.runId, kanbanColumn: "in_progress" },
  });
}

export async function markDeskItemsConsumed(input: {
  deskItemIds: string[];
  runId: string;
}): Promise<void> {
  if (input.deskItemIds.length === 0) return;
  await prisma.productDeskItem.updateMany({
    where: { id: { in: input.deskItemIds } },
    data: { status: "consumed", consumedByRunId: input.runId, kanbanColumn: "done" },
  });
}

export function buildDeskInputBrief(items: DeskItemDto[]): string {
  if (items.length === 0) return "";
  const blocks = items.map((item, i) => {
    const preview = item.previewText ?? "";
    const bodyText =
      typeof item.body.content === "string"
        ? item.body.content
        : typeof item.body.text === "string"
          ? item.body.text
          : preview;
    return `### Input ${i + 1}: ${item.title} (${item.humanTypeLabel})
${bodyText.slice(0, 6000)}`;
  });
  return `## Approved desk inputs\n\n${blocks.join("\n\n")}`;
}

export async function persistDeskItemsFromRun(input: {
  tenantId: string;
  productId: string;
  productName: string;
  runId: string;
  workflowName: string;
  memory: SharedMemory;
}): Promise<number> {
  const history = Array.isArray(input.memory._history) ? input.memory._history : [];
  let created = 0;

  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    if (!h?.agentName) continue;
    const output =
      typeof h.output === "string" && h.output.trim()
        ? h.output
        : typeof input.memory[h.agentName] === "string"
          ? String(input.memory[h.agentName])
          : "";
    if (output.trim().length < 80) continue;

    const handoff = extractHandoffFromAgentOutput(output, h.agentName, h.stepOrder ?? i + 1);
    const type = inferDeskItemType(h.agentName, output);
    const title =
      handoff.content.split("\n").find((l) => l.trim().length > 8)?.trim().slice(0, 120) ??
      `${humanLabelForDeskType(type)} — ${h.agentName}`;

    await createDeskItem({
      tenantId: input.tenantId,
      productId: input.productId,
      type,
      title,
      previewText: truncatePreview(handoff.content || output),
      body: {
        content: handoff.content || output,
        agentName: h.agentName,
        stepOrder: h.stepOrder ?? i + 1,
        workflowName: input.workflowName,
        savedDeliverablePath: h.savedDeliverablePath ?? null,
        wroteDocs: h.wroteDocs ?? false,
      },
      sourceKind: "run",
      sourceMeta: { workflowName: input.workflowName },
      runId: input.runId,
      createdByAgent: h.agentName,
      suggestedNextRole: suggestNextRoleForType(type),
      status: "draft",
    });
    created += 1;
  }

  const nextAction = asString(input.memory.nextAction);
  if (nextAction && nextAction.length >= 12) {
    await createDeskItem({
      tenantId: input.tenantId,
      productId: input.productId,
      type: "task",
      title: `Next: ${nextAction.slice(0, 100)}`,
      previewText: truncatePreview(nextAction),
      body: { content: nextAction, kind: "next_action" },
      sourceKind: "run",
      sourceMeta: { workflowName: input.workflowName },
      runId: input.runId,
      status: "draft",
    });
    created += 1;
  }

  return created;
}

export async function getDeskPendingCounts(
  tenantId: string,
  productId: string,
): Promise<{ draft: number; approved: number; inProgress: number }> {
  const [draft, approved, inProgress] = await Promise.all([
    prisma.productDeskItem.count({ where: { tenantId, productId, status: "draft" } }),
    prisma.productDeskItem.count({ where: { tenantId, productId, status: "approved" } }),
    prisma.productDeskItem.count({ where: { tenantId, productId, status: "in_progress" } }),
  ]);
  return { draft, approved, inProgress };
}

export interface ProductRoadmapBoard {
  backlog: DeskItemDto[];
  approved: DeskItemDto[];
  inProgress: DeskItemDto[];
  done: DeskItemDto[];
}

export async function getProductRoadmap(
  tenantId: string,
  productId: string,
): Promise<ProductRoadmapBoard> {
  const rows = await prisma.productDeskItem.findMany({
    where: {
      tenantId,
      productId,
      status: { not: "archived" },
      type: { in: ["spec", "task", "adr", "code", "report"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 80,
  });

  const board: ProductRoadmapBoard = {
    backlog: [],
    approved: [],
    inProgress: [],
    done: [],
  };

  for (const row of rows) {
    const col = row.kanbanColumn ?? kanbanForStatus(row.status) ?? "backlog";
    const dto = serializeDeskItem(row);
    if (col === "backlog") board.backlog.push(dto);
    else if (col === "approved") board.approved.push(dto);
    else if (col === "in_progress") board.inProgress.push(dto);
    else board.done.push(dto);
  }

  return board;
}

export async function updateDeskItemKanbanColumn(input: {
  tenantId: string;
  productId: string;
  deskItemId: string;
  column: KanbanColumn;
}): Promise<DeskItemDto> {
  const row = await prisma.productDeskItem.findFirst({
    where: { id: input.deskItemId, productId: input.productId, tenantId: input.tenantId },
  });
  if (!row) throw new Error("Desk item not found");

  const statusMap: Partial<Record<KanbanColumn, DeskItemStatus>> = {
    backlog: "draft",
    approved: "approved",
    in_progress: "in_progress",
    done: "consumed",
  };

  const updated = await prisma.productDeskItem.update({
    where: { id: row.id },
    data: {
      kanbanColumn: input.column,
      status: statusMap[input.column] ?? row.status,
    },
  });
  return serializeDeskItem(updated);
}
