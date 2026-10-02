/**
 * Tipos del runtime de sesiones (Fase 0, camino B — reemplazo directo del DAG).
 * ExecutionRun pasa a ser contenedor de AgentSession; cada sesión es un loop
 * pensar→actuar con tools→observar hasta DONE / need_input / presupuesto.
 */

import type { AgentSessionStatus, SessionToolCallStatus } from "@prisma/client";
import type { AgentProvider, AgentModelKind } from "@prisma/client";

export type { AgentSessionStatus, SessionToolCallStatus };

export interface AcceptanceCriterion {
  id: string;
  description: string;
  kind?: "file_exists" | "file_contains" | "shell_pass" | "custom";
}

export interface AgentSessionConfig {
  runId: string;
  tenantId?: string | null;
  agentId: string;
  role?: string;
  goal: string;
  acceptanceCriteria?: AcceptanceCriterion[];
  workspacePath: string;
  provider?: AgentProvider | null;
  model?: string | null;
  modelKind?: AgentModelKind | null;
  temperature?: number;
  maxTurns?: number;
  budgetTokens?: number | null;
  budgetUsd?: number | null;
}

export interface SessionToolCallRecord {
  toolName: string;
  argsJson: Record<string, unknown>;
  resultJson?: unknown;
  exitCode?: number | null;
  durationMs?: number | null;
  status: SessionToolCallStatus;
  error?: string | null;
}

export interface SessionTurnResult {
  turnNo: number;
  input: string;
  output: string | null;
  tokens: number;
  costUsd: number;
  toolCalls: SessionToolCallRecord[];
  doneMarker?: boolean;
  doneSummary?: string | null;
  needInput?: { prompt: string } | null;
  veto?: { reason: string } | null;
}

export interface AgentLoopResult {
  sessionId: string;
  status: AgentSessionStatus;
  turnsExecuted: number;
  spentTokens: number;
  spentCostUsd: number;
  summary?: string | null;
  lastError?: string | null;
}

export type SessionEventType =
  | "session_started"
  | "turn_started"
  | "tool_call"
  | "tool_result"
  | "file_changed"
  | "need_input"
  | "tool_approval"
  | "budget_exceeded"
  | "session_memory_updated"
  | "session_handoff"
  | "session_deliverables"
  | "session_completed"
  | "session_failed"
  | "veto";

export interface RunContextForSession {
  runId: string;
  tenantId?: string | null;
  productSlug?: string | null;
  productId?: string | null;
  githubToken?: string | null;
  sharedMemory?: Record<string, unknown>;
  /** Human response to a need_input/tool_approval checkpoint (resume only). */
  humanInput?: string | null;
}
