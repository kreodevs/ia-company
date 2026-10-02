/**
 * TurnExecutor — Fase 0 (camino B).
 * Ejecuta UN turno de una AgentSession: prompt → generateText con tools
 * (routed por ToolGateway) → parse de marcadores de control → persistencia.
 *
 * Protocolo de control en la salida del modelo:
 *   SESSION_DONE: <resumen>   → el agente considera cumplido el goal
 *   NEED_INPUT: <pregunta>    → se requiere input humano (HITL checkpoint)
 */

import { generateText, type LanguageModel, type ToolSet } from "ai";
import type { ResolvedAgentLlmConfig } from "../../lib/tenant-llm.js";
import { formatLlmProviderError } from "../providers.js";
import { providerConfigFromResolved, createLanguageModel } from "../providers.js";
import { estimateSessionCostUsd } from "../provider-router.js";
import { extractMungerVeto } from "../../lib/munger-veto.js";
import { finishSessionTurn, startSessionTurn } from "../../lib/session-store.js";
import type {
  AcceptanceCriterion,
  SessionToolCallRecord,
  SessionTurnResult,
} from "./types.js";

const DEFAULT_MAX_STEPS_PER_TURN = 12;
const MAX_HISTORY_TURNS = 6;
const MAX_HISTORY_OUTPUT_CHARS = 3_000;
const MAX_HISTORY_INPUT_CHARS = 600;

const SESSION_DONE_RE = /^[ \t]*SESSION_DONE:[ \t]*(.+)$/im;
const NEED_INPUT_RE = /^[ \t]*NEED_INPUT:[ \t]*(.+)$/im;

export interface TurnHistoryEntry {
  turnNo: number;
  input: string;
  output: string | null;
}

export interface TurnExecutionContext {
  runId: string;
  sessionId: string;
  agent: { id: string; name: string; role?: string | null; temperature: number };
  llm: ResolvedAgentLlmConfig;
  tools: ToolSet;
  goal: string;
  acceptanceCriteria: AcceptanceCriterion[];
  workspacePath: string;
  historyTurns?: TurnHistoryEntry[];
  maxStepsPerTurn?: number;
  extraSystem?: string;
  /** Test seam and optional provider override; production defaults to the resolved provider. */
  modelFactory?: (llm: ResolvedAgentLlmConfig) => LanguageModel;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max)}\n… [truncated]`;
}

function buildSessionSystemPrompt(ctx: TurnExecutionContext): string {
  const role = ctx.agent.role ? ` — ${ctx.agent.role}` : "";
  const criteria = ctx.acceptanceCriteria.length
    ? ctx.acceptanceCriteria.map((c) => `- [${c.id}] ${c.description}`).join("\n")
    : "- [goal] The goal above is demonstrably achieved in the workspace.";

  return `You are "${ctx.agent.name}"${role}, an autonomous agent session inside Auto-Company.

GOAL:
${ctx.goal}

ACCEPTANCE CRITERIA (every one must be verifiably satisfied before you may finish):
${criteria}

WORKSPACE: ${ctx.workspacePath}
All tool paths are relative to this workspace root.

AVAILABLE TOOLS: ${Object.keys(ctx.tools).join(", ") || "(none)"}

TURN PROTOCOL:
1. Use the tools to inspect and modify the workspace. Read before writing. Never invent file contents or command results.
2. Act efficiently: do not repeat tool calls whose outcome you already have.
3. When the goal is fully met and every acceptance criterion above is satisfied, end your final message with a single line, exactly:
SESSION_DONE: <one-sentence summary of what was accomplished>
4. If and only if you are blocked on information or a decision only the human can provide, end with a single line, exactly:
NEED_INPUT: <the specific question>
5. Never emit SESSION_DONE while any criterion is unmet; keep working with tools instead.
${ctx.extraSystem ? `\n${ctx.extraSystem}` : ""}`;
}

function buildTurnUserPrompt(ctx: TurnExecutionContext, turnInput: string): string {
  const history = (ctx.historyTurns ?? []).slice(-MAX_HISTORY_TURNS);
  if (history.length === 0) return turnInput;

  const historyBlock = history
    .map((t) => {
      const input = truncate(t.input, MAX_HISTORY_INPUT_CHARS);
      const output = t.output ? truncate(t.output, MAX_HISTORY_OUTPUT_CHARS) : "(no text output)";
      return `--- Turn ${t.turnNo} ---\nINPUT:\n${input}\nOUTPUT:\n${output}`;
    })
    .join("\n\n");

  return `PRIOR TURNS OF THIS SESSION (already done, for context — do not redo them):\n\n${historyBlock}\n\n---\nCURRENT TURN INSTRUCTION:\n${turnInput}`;
}

interface LlmStepLike {
  toolCalls?: Array<{ toolCallId?: string; toolName: string; args?: unknown }>;
  toolResults?: Array<{ toolCallId?: string; toolName: string; result?: unknown }>;
}

function collectToolCalls(steps: LlmStepLike[]): SessionToolCallRecord[] {
  const records: SessionToolCallRecord[] = [];
  for (const step of steps) {
    for (const call of step.toolCalls ?? []) {
      const result = (step.toolResults ?? []).find((r) => r.toolCallId === call.toolCallId)?.result;
      const resultError =
        result && typeof result === "object" && typeof (result as { error?: unknown }).error === "string"
          ? ((result as { error: string }).error as string)
          : null;
      const exitCodeRaw = (result as { exitCode?: unknown } | undefined)?.exitCode;
      records.push({
        toolName: call.toolName,
        argsJson: (call.args ?? {}) as Record<string, unknown>,
        resultJson: result,
        exitCode: typeof exitCodeRaw === "number" ? exitCodeRaw : null,
        durationMs: null,
        status: resultError ? "error" : "ok",
        error: resultError,
      });
    }
  }
  return records;
}

/**
 * Runs exactly one session turn: creates the SessionTurn row (so the gateway
 * audits attach to it), calls the LLM with tools, parses control markers and
 * persists the finished turn.
 */
export async function executeSessionTurn(
  ctx: TurnExecutionContext,
  turnInput: string,
): Promise<SessionTurnResult> {
  const turnNo = (ctx.historyTurns?.length ?? 0) + 1;
  const turn = await startSessionTurn({ sessionId: ctx.sessionId, turnNo, input: turnInput });

  const system = buildSessionSystemPrompt(ctx);
  const prompt = buildTurnUserPrompt(ctx, turnInput);
  const model = ctx.modelFactory
    ? ctx.modelFactory(ctx.llm)
    : createLanguageModel(providerConfigFromResolved(ctx.llm));

  const response = await generateText({
    model,
    temperature: ctx.agent.temperature,
    system,
    prompt,
    tools: ctx.tools as NonNullable<Parameters<typeof generateText>[0]["tools"]>,
    maxSteps: ctx.maxStepsPerTurn ?? DEFAULT_MAX_STEPS_PER_TURN,
  }).catch((err: unknown) => {
    throw new Error(formatLlmProviderError(err, ctx.llm));
  });

  const output = response.text ?? "";
  const promptTokens = response.usage?.promptTokens ?? 0;
  const completionTokens = response.usage?.completionTokens ?? 0;
  const tokens = promptTokens + completionTokens;
  const costUsd = estimateSessionCostUsd(ctx.llm.model, promptTokens, completionTokens);

  const doneMatch = SESSION_DONE_RE.exec(output);
  const needInputMatch = NEED_INPUT_RE.exec(output);
  const veto = extractMungerVeto(ctx.agent.name, output);

  const result: SessionTurnResult = {
    turnNo,
    input: turnInput,
    output,
    tokens,
    costUsd,
    toolCalls: collectToolCalls((response.steps ?? []) as LlmStepLike[]),
    doneMarker: !needInputMatch && !veto && Boolean(doneMatch),
    doneSummary: doneMatch ? doneMatch[1].trim() : null,
    needInput: needInputMatch ? { prompt: needInputMatch[1].trim() } : null,
    veto: veto ? { reason: veto.reason } : null,
  };

  await finishSessionTurn({ turnId: turn.id, output, tokens, costUsd });

  return result;
}
