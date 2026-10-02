import { appendProductHandoff, extractHandoffFromAgentOutput } from "./product-consensus.js";
import { prisma } from "./prisma.js";

const ROLLING_SUMMARY_INTERVAL = 5;
const MAX_SUMMARY_CHARS = 8_000;
const MAX_TURN_OUTPUT_CHARS = 2_000;

export interface SessionMemoryContext {
  sessionId: string;
  runId: string;
  tenantId: string | null;
  agentName: string;
  productId?: string | null;
  productSlug?: string | null;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max)}\n... [truncated]`;
}

/**
 * Builds a deterministic rolling memory from the prior summary and recent
 * turns. Keeping this local avoids an extra model call every five turns while
 * preserving the facts and tool work needed by the next turn/session.
 */
export function buildRollingSessionSummary(
  previousSummary: string | null | undefined,
  turns: Array<{ turnNo: number; input: string; output: string | null }>,
): string {
  const lines: string[] = [];
  if (previousSummary?.trim()) {
    lines.push("## Previous session memory", truncate(previousSummary.trim(), 3_000), "");
  }
  lines.push("## Recent work");
  for (const turn of turns.slice(-5)) {
    const output = turn.output?.trim() || "(no textual output)";
    lines.push(`### Turn ${turn.turnNo}`, `Instruction: ${truncate(turn.input.trim(), 500)}`, `Result: ${truncate(output, MAX_TURN_OUTPUT_CHARS)}`, "");
  }
  return truncate(lines.join("\n").trim(), MAX_SUMMARY_CHARS);
}

export function shouldRefreshRollingSummary(turnNo: number): boolean {
  return turnNo > 0 && turnNo % ROLLING_SUMMARY_INTERVAL === 0;
}

export async function refreshSessionRollingSummary(
  context: SessionMemoryContext,
  previousSummary?: string | null,
): Promise<string> {
  const turns = await prisma.sessionTurn.findMany({
    where: { sessionId: context.sessionId },
    orderBy: { turnNo: "asc" },
    select: { turnNo: true, input: true, output: true },
  });
  const summary = buildRollingSessionSummary(previousSummary, turns);
  await prisma.agentSession.update({
    where: { id: context.sessionId },
    data: { summary },
  });
  return summary;
}

/** Persist the completed agent's structured handoff into product consensus. */
export async function persistSessionHandoff(
  context: SessionMemoryContext,
  output: string,
  stepOrder: number,
): Promise<void> {
  if (!context.productId || !context.productSlug || !context.tenantId || !output.trim()) return;
  const handoff = extractHandoffFromAgentOutput(output, context.agentName, stepOrder);
  await appendProductHandoff({
    ...handoff,
    productId: context.productId,
    productSlug: context.productSlug,
    tenantId: context.tenantId,
    runId: context.runId,
  });
}

export { ROLLING_SUMMARY_INTERVAL };
