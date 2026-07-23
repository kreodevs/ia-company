import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { ensureProductWorkspace } from "./product-workspace.js";
import { collectJsonObjects, asString, asStringArray } from "./structured-memory.js";
import type { SharedMemory } from "../types/index.js";

export const PRODUCT_CONSENSUS_FILE_NAME = "consensus.md";

export interface ConsensusVeto {
  by: string;
  reason: string;
}

export interface ConsensusDecision {
  by: string;
  what: string;
  why?: string;
}

export interface AgentHandoff {
  agentName: string;
  stepId?: string;
  stepOrder: number;
  runId?: string;
  content: string;
  nextAction?: string;
  decisions?: ConsensusDecision[];
  openQuestions?: string[];
  veto?: ConsensusVeto | null;
}

export const DEFAULT_PRODUCT_CONSENSUS_CONTENT = (productName: string): string =>
  `# ${productName}\n\nProduct-scoped consensus memory. Each agent handoff appends a revision here.\n\n## Next Action\nDefine the next cycle focus.\n`;

export function buildProductContentFromRevision(
  existingContent: string,
  handoff: AgentHandoff,
): string {
  const trimmed = existingContent.trim();
  const stamp = new Date().toISOString();
  const lines: string[] = [];
  if (trimmed) lines.push(trimmed, "");

  lines.push(`## Cycle ${handoff.stepOrder} — ${handoff.agentName} (${stamp})`);
  lines.push("");

  const body = handoff.content.trim();
  if (body) {
    lines.push(body);
    lines.push("");
  }

  if (handoff.decisions && handoff.decisions.length > 0) {
    lines.push("**Decisions:**");
    for (const d of handoff.decisions) {
      lines.push(`- ${d.by}: ${d.what}${d.why ? ` — _${d.why}_` : ""}`);
    }
    lines.push("");
  }

  if (handoff.openQuestions && handoff.openQuestions.length > 0) {
    lines.push("**Open questions:**");
    for (const q of handoff.openQuestions) lines.push(`- ${q}`);
    lines.push("");
  }

  if (handoff.veto) {
    lines.push(`**VETO** by ${handoff.veto.by}: ${handoff.veto.reason}`);
    lines.push("");
  }

  if (handoff.nextAction) {
    lines.push(`**Next action:** ${handoff.nextAction}`);
    lines.push("");
  }

  return lines.join("\n");
}

export function formatProductConsensusFileBody(
  content: string,
  nextAction: string | null,
): string {
  const trimmed = content.trim();
  if (!trimmed) return DEFAULT_PRODUCT_CONSENSUS_CONTENT("Product");
  if (!nextAction?.trim() || /## Next Action/i.test(trimmed)) {
    return `${trimmed}\n`;
  }
  return `${trimmed}\n\n## Next Action\n${nextAction.trim()}\n`;
}

export async function ensureProductConsensus(productId: string): Promise<{
  id: string;
  productId: string;
  tenantId: string;
  content: string;
  nextAction: string | null;
  cycleNumber: number;
}> {
  const product = await prisma.tenantProduct.findUniqueOrThrow({
    where: { id: productId },
    select: { id: true, tenantId: true, name: true },
  });
  const existing = await prisma.productConsensus.findUnique({ where: { productId } });
  if (existing) return existing;

  const created = await prisma.productConsensus.create({
    data: {
      productId: product.id,
      tenantId: product.tenantId,
      content: DEFAULT_PRODUCT_CONSENSUS_CONTENT(product.name),
      cycleNumber: 0,
    },
  });
  return created;
}

export async function getProductConsensus(productId: string) {
  return prisma.productConsensus.findUnique({ where: { productId } });
}

/** @param tenantProductId — TenantProduct.id (NOT ProductConsensus.id) */
export async function listProductConsensusRevisions(
  tenantProductId: string,
  limit = 50,
): Promise<
  Array<{
    id: string;
    productId: string;
    runId: string | null;
    stepId: string | null;
    agentName: string;
    stepOrder: number;
    content: string;
    nextAction: string | null;
    decisions: Prisma.JsonValue;
    openQuestions: Prisma.JsonValue;
    veto: Prisma.JsonValue;
    createdAt: Date;
  }>
> {
  const consensus = await prisma.productConsensus.findUnique({
    where: { productId: tenantProductId },
    select: { id: true },
  });
  if (!consensus) return [];

  return prisma.productConsensusRevision.findMany({
    where: { productId: consensus.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function syncProductConsensusFileToWorkspace(
  productSlug: string,
  content: string,
  nextAction: string | null,
): Promise<string> {
  const root = await ensureProductWorkspace(productSlug);
  await writeFile(
    join(root, PRODUCT_CONSENSUS_FILE_NAME),
    formatProductConsensusFileBody(content, nextAction),
    "utf-8",
  );
  return root;
}

export async function syncProductConsensusToWorkspace(
  productId: string,
  productSlug: string,
): Promise<void> {
  const consensus = await prisma.productConsensus.findUnique({ where: { productId } });
  const content = consensus?.content ?? "";
  await syncProductConsensusFileToWorkspace(productSlug, content, consensus?.nextAction ?? null);
}

export interface AppendHandoffInput extends AgentHandoff {
  productId: string;
  productSlug: string;
  tenantId: string;
}

/** Cycle section only — used in revision rows (not the full consensus document). */
export function buildHandoffRevisionContent(handoff: AgentHandoff): string {
  return buildProductContentFromRevision("", handoff);
}

export async function appendProductHandoff(
  input: AppendHandoffInput,
): Promise<{ revisionId: string; cycleNumber: number }> {
  const consensus = await ensureProductConsensus(input.productId);
  const newContent = buildProductContentFromRevision(consensus.content, input);
  const revisionContent = buildHandoffRevisionContent(input);

  const updated = await prisma.$transaction(async (tx) => {
    const revision = await tx.productConsensusRevision.create({
      data: {
        productId: consensus.id,
        runId: input.runId ?? null,
        stepId: input.stepId ?? null,
        agentName: input.agentName,
        stepOrder: input.stepOrder,
        content: revisionContent,
        nextAction: input.nextAction ?? null,
        decisions: (input.decisions ?? []) as unknown as Prisma.InputJsonValue,
        openQuestions: (input.openQuestions ?? []) as unknown as Prisma.InputJsonValue,
        veto: (input.veto ?? null) as unknown as Prisma.InputJsonValue,
      },
    });
    await tx.productConsensus.update({
      where: { productId: consensus.productId },
      data: {
        content: newContent,
        nextAction: input.nextAction ?? consensus.nextAction,
        cycleNumber: { increment: 1 },
      },
    });
    return revision;
  });

  await syncProductConsensusFileToWorkspace(
    input.productSlug,
    newContent,
    input.nextAction ?? consensus.nextAction,
  );

  return { revisionId: updated.id, cycleNumber: consensus.cycleNumber + 1 };
}

export async function updateProductConsensusContent(
  productId: string,
  productSlug: string,
  content: string,
  nextAction: string | null,
): Promise<void> {
  const consensus = await ensureProductConsensus(productId);
  await prisma.productConsensus.update({
    where: { productId: consensus.productId },
    data: { content, nextAction },
  });
  await syncProductConsensusFileToWorkspace(productSlug, content, nextAction);
}

function stripConsensusJsonBlocks(text: string): string {
  return text.replace(/```(?:json)?\s*[\s\S]*?```/gi, "").trim();
}

export function parseConsensusHandoffFromOutput(
  output: string,
  agentName: string,
): Partial<AgentHandoff> {
  const parsed: Partial<AgentHandoff> = { agentName };
  if (!output.trim()) return parsed;

  for (const obj of collectJsonObjects(output)) {
    const consensusUpdate = asString(obj.consensusUpdate);
    if (consensusUpdate) parsed.content = consensusUpdate;

    const nextAction = asString(obj.nextAction);
    if (nextAction) parsed.nextAction = nextAction;

    if (Array.isArray(obj.decisions)) {
      parsed.decisions = (obj.decisions as Array<Record<string, unknown>>)
        .filter((d) => d && typeof d === "object")
        .map((d) => ({
          by: typeof d.by === "string" ? d.by : agentName,
          what: typeof d.what === "string" ? d.what : "",
          why: typeof d.why === "string" ? d.why : undefined,
        }))
        .filter((d) => d.what.length > 0);
    }

    const openQuestions = asStringArray(obj.openQuestions);
    if (openQuestions.length > 0) parsed.openQuestions = openQuestions;

    if (obj.veto && typeof obj.veto === "object") {
      const v = obj.veto as Record<string, unknown>;
      if (typeof v.by === "string" && typeof v.reason === "string") {
        parsed.veto = { by: v.by, reason: v.reason };
      }
    }

    if (
      parsed.content ||
      parsed.nextAction ||
      (parsed.decisions && parsed.decisions.length > 0) ||
      (parsed.openQuestions && parsed.openQuestions.length > 0) ||
      parsed.veto
    ) {
      break;
    }
  }

  return parsed;
}

export function extractHandoffFromAgentOutput(
  output: string,
  agentName: string,
  stepOrder: number,
): AgentHandoff {
  const parsed = parseConsensusHandoffFromOutput(output, agentName);
  const content = parsed.content?.trim() || stripConsensusJsonBlocks(output);

  return {
    agentName,
    stepOrder,
    content,
    nextAction: parsed.nextAction,
    decisions: parsed.decisions,
    openQuestions: parsed.openQuestions,
    veto: parsed.veto,
  };
}

export function extractHandoffFromSharedMemory(
  memory: SharedMemory,
  agentName: string,
): AgentHandoff {
  const handoff: AgentHandoff = {
    agentName,
    stepOrder: typeof memory.stepOrder === "number" ? memory.stepOrder : 0,
    content: "",
  };

  if (typeof memory.consensusUpdate === "string" && memory.consensusUpdate.trim()) {
    handoff.content = memory.consensusUpdate.trim();
  } else if (typeof memory.lastOutput === "string") {
    handoff.content = memory.lastOutput.trim();
  }

  if (typeof memory.nextAction === "string") handoff.nextAction = memory.nextAction.trim();

  if (Array.isArray(memory.decisions)) {
    handoff.decisions = (memory.decisions as Array<Record<string, unknown>>)
      .filter((d) => d && typeof d === "object")
      .map((d) => ({
        by: typeof d.by === "string" ? d.by : agentName,
        what: typeof d.what === "string" ? d.what : "",
        why: typeof d.why === "string" ? d.why : undefined,
      }))
      .filter((d) => d.what.length > 0);
  }

  if (Array.isArray(memory.openQuestions)) {
    handoff.openQuestions = (memory.openQuestions as unknown[])
      .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
      .map((q) => q.trim());
  }

  if (memory.veto && typeof memory.veto === "object") {
    const v = memory.veto as Record<string, unknown>;
    if (typeof v.by === "string" && typeof v.reason === "string") {
      handoff.veto = { by: v.by, reason: v.reason };
    }
  }

  return handoff;
}

export async function loadProductConsensusInitialMemory(
  _tenantId: string,
  productId: string,
  override: SharedMemory = {},
): Promise<SharedMemory> {
  const consensus = await prisma.productConsensus.findUnique({ where: { productId } });
  const nextAction = consensus?.nextAction ?? "Execute autonomous cycle";
  return {
    ...override,
    consensus: override.consensus ?? consensus?.content,
    nextAction: (typeof override.nextAction === "string" ? override.nextAction : undefined) ?? nextAction,
    task: (typeof override.task === "string" ? override.task : undefined) ?? nextAction,
  };
}