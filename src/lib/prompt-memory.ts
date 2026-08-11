import type { SharedMemory } from "../types/index.js";
import { isStuckPivotNextAction, unwrapStuckNextAction } from "./stuck-action.js";

const MAX_CONSENSUS_IN_PROMPT_CHARS = 12_000;
const MAX_STRING_FIELD_CHARS = 4_000;

function truncateText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n\n… [older consensus revisions omitted from prompt — use the \`consensus\` field in Shared Workflow Memory as authoritative for this run]`;
}

function sanitizeStringField(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (isStuckPivotNextAction(trimmed)) {
    return unwrapStuckNextAction(trimmed);
  }
  return truncateText(trimmed, MAX_STRING_FIELD_CHARS);
}

/** Shrink and sanitize shared memory before embedding in LLM prompts. */
export function prepareSharedMemoryForPrompt(memory: SharedMemory): SharedMemory {
  const prepared: SharedMemory = { ...memory };

  if (typeof prepared.task === "string") {
    prepared.task = sanitizeStringField(prepared.task) as string;
  }
  if (typeof prepared.nextAction === "string") {
    prepared.nextAction = sanitizeStringField(prepared.nextAction) as string;
  }
  if (typeof prepared.consensus === "string") {
    prepared.consensus = truncateText(prepared.consensus, MAX_CONSENSUS_IN_PROMPT_CHARS);
  }

  return prepared;
}
