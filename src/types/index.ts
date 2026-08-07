import type { AgentProvider, ExecutionStatus, LogLevel, AgentModelKind } from "@prisma/client";

export type { AgentProvider, ExecutionStatus, LogLevel, AgentModelKind };

export interface ProviderConfig {
  provider: AgentProvider;
  model: string;
  temperature: number;
  modelKind?: AgentModelKind;
  apiKey?: string;
  baseURL?: string;
}

export interface StepInputConfig {
  passSharedMemory?: boolean;
  customPrompt?: string;
  contextKeys?: string[];
}

export interface StepOutputConfig {
  appendToSharedMemory?: boolean;
  memoryKey?: string;
}

export interface SharedMemory {
  [key: string]: unknown;
  _history?: Array<{
    stepId: string;
    agentName: string;
    output: string;
    timestamp: string;
    stepOrder?: number;
    /** Agent used write_file under docs/ during the step. */
    wroteDocs?: boolean;
    /** Engine already persisted a fallback deliverable for this step. */
    savedDeliverablePath?: string;
  }>;
}

export interface ExecutionEvent {
  type: "status" | "log" | "step_start" | "step_complete" | "error" | "done" | "veto";
  runId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface AgentWithSkills {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  provider: AgentProvider | null;
  model: string | null;
  modelKind: AgentModelKind;
  temperature: number;
  skills: Array<{
    id: string;
    name: string;
    description: string;
    promptContent: string;
  }>;
}

export interface WorkflowGraph {
  id: string;
  name: string;
  steps: Array<{
    id: string;
    agentId: string;
    stepOrder: number;
    label: string | null;
    positionX: number;
    positionY: number;
    inputConfig: StepInputConfig;
    outputConfig: StepOutputConfig;
    agent: AgentWithSkills;
  }>;
  edges: Array<{
    id: string;
    sourceStepId: string;
    targetStepId: string;
    sourceHandle: string | null;
    targetHandle: string | null;
  }>;
}

export interface ToolExecutionContext {
  workspaceRoot: string;
  shellTimeoutMs: number;
  runId: string;
  tenantId?: string;
  productSlug?: string;
  productId?: string;
  githubToken?: string;
  agentId?: string;
  agentName?: string;
  toolMode?: "full" | "readonly" | "opencode_delegate";
  sharedMemory?: SharedMemory;
  onLog?: (message: string, payload?: Record<string, unknown>) => void;
  onDelegationStarted?: () => void;
  resumeFromStepOrder?: number;
}

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface StepResult {
  output: string;
  usage: LLMUsage;
  toolCalls: number;
  mcpToolCalls?: number;
  mcpFallbackUsed?: boolean;
  delegated?: boolean;
  wroteDocs?: boolean;
  savedDeliverablePath?: string;
}

export interface CreateAgentInput {
  name: string;
  role: string;
  systemPrompt: string;
  provider?: AgentProvider | null;
  model?: string | null;
  modelKind?: AgentModelKind;
  temperature?: number;
  skillIds?: string[];
  tenantId?: string;
}

export interface UpdateAgentInput extends Partial<CreateAgentInput> {
  isActive?: boolean;
}

export interface CreateSkillInput {
  name: string;
  description: string;
  promptContent: string;
  tenantId?: string;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  tenantId?: string;
  steps?: Array<{
    id?: string;
    agentId: string;
    stepOrder?: number;
    label?: string;
    positionX?: number;
    positionY?: number;
    inputConfig?: StepInputConfig;
    outputConfig?: StepOutputConfig;
  }>;
  edges?: Array<{
    id?: string;
    sourceStepId: string;
    targetStepId: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
}

export interface ExecuteWorkflowInput {
  initialMemory?: SharedMemory;
  tenantId?: string;
  /** When true (default), merge tenant consensus into initial memory */
  mergeConsensus?: boolean;
  /** When true (default), write shared memory back to tenant consensus on success */
  syncConsensus?: boolean;
  productId?: string;
  productSlug?: string;
  workflowName?: string;
  metaReason?: string;
  resumeFromStepOrder?: number;
  forceLocalImplementation?: boolean;
  afterOpencodeDelegation?: boolean;
  /** Bypass launch guards (e.g. human-initiated drill-down). */
  skipRunGuard?: boolean;
}
