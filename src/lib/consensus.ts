import { prisma } from "./prisma.js";
import type { SharedMemory } from "../types/index.js";

export function mergeConsensusIntoMemory(
  consensus: { content: string; nextAction: string | null } | null,
  override: SharedMemory = {},
): SharedMemory {
  const nextAction =
    (typeof override.nextAction === "string" ? override.nextAction : undefined) ??
    consensus?.nextAction ??
    "Execute autonomous cycle";

  return {
    ...override,
    consensus: override.consensus ?? consensus?.content,
    nextAction,
    task:
      (typeof override.task === "string" ? override.task : undefined) ?? nextAction,
  };
}

export function buildConsensusContentAfterRun(
  existingContent: string,
  memory: SharedMemory,
): string {
  if (typeof memory.consensusUpdate === "string" && memory.consensusUpdate.trim()) {
    return memory.consensusUpdate.trim();
  }

  if (typeof memory.consensus === "string" && memory.consensus.trim() && memory.consensus !== existingContent) {
    return memory.consensus.trim();
  }

  const agent = typeof memory.lastAgent === "string" ? memory.lastAgent : "workflow";
  const output = typeof memory.lastOutput === "string" ? memory.lastOutput : "";
  if (!output.trim()) return existingContent;

  const stamp = new Date().toISOString();
  return `${existingContent.trim()}\n\n## Cycle ${stamp}\n**${agent}**\n\n${output.trim()}\n`;
}

export async function loadConsensusInitialMemory(
  tenantId: string,
  override: SharedMemory = {},
): Promise<SharedMemory> {
  const consensus = await prisma.tenantConsensus.findUnique({ where: { tenantId } });
  return mergeConsensusIntoMemory(consensus, override);
}

export async function persistConsensusFromRun(tenantId: string, memory: SharedMemory): Promise<void> {
  const existing = await prisma.tenantConsensus.findUnique({ where: { tenantId } });
  const baseContent = existing?.content ?? "# Consensus\n\nShared memory for autonomous cycles.";

  const content = buildConsensusContentAfterRun(baseContent, memory);
  const nextAction =
    typeof memory.nextAction === "string" && memory.nextAction.trim()
      ? memory.nextAction.trim()
      : existing?.nextAction;

  await prisma.tenantConsensus.upsert({
    where: { tenantId },
    update: { content, nextAction },
    create: {
      tenantId,
      content,
      nextAction: nextAction ?? "Define the next cycle focus",
    },
  });
}
