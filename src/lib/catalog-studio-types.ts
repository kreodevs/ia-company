import type { SuggestedAgentDef } from "./org-os-types.js";

export interface StudioMungerReview {
  approved: boolean;
  notes: string;
  veto?: { by: string; reason: string };
}

/** Draft skill — human must approve explicitly on apply. */
export interface NewSkillDraft {
  name: string;
  description: string;
  promptContent: string;
}

export interface SkillReuseSuggestion {
  existingSkillId: string;
  existingSkillName: string;
  reason: string;
}

export interface SkillStudioProposal {
  brief: string;
  /** When set, LLM recommends reusing an existing tenant skill — no create on apply unless user overrides. */
  reuse?: SkillReuseSuggestion;
  /** New skill draft — only created when apply sends `approved: true`. */
  skill?: NewSkillDraft;
  mungerReview?: StudioMungerReview;
}

export interface AgentReuseSuggestion {
  existingAgentId: string;
  existingAgentName: string;
  reason: string;
}

/** MCP access the proposed agent should receive on apply. */
export interface McpGrantProposal {
  serverId: string;
  serverSlug: string;
  serverName: string;
  /** null = all enabled tools on the server */
  toolNames: string[] | null;
  reason: string;
}

export interface AgentStudioProposal {
  brief: string;
  reuse?: AgentReuseSuggestion;
  agent?: SuggestedAgentDef;
  /** Existing tenant skill names to link (must exist at apply time). */
  existingSkillNames: string[];
  /** New skills — only created if listed in `approvedNewSkillNames` on apply. */
  newSkills: NewSkillDraft[];
  /** MCP servers to grant — applied when human approves the agent. */
  mcpGrants?: McpGrantProposal[];
  mungerReview?: StudioMungerReview;
}

export interface ApplySkillStudioInput {
  proposal: SkillStudioProposal;
  /** Required human confirmation to create (ignored when reusing). */
  approved: boolean;
}

export interface ApplyAgentStudioInput {
  proposal: AgentStudioProposal;
  /** Required human confirmation to create agent (ignored when reusing). */
  approved: boolean;
  /** Subset of `proposal.newSkills[].name` the user explicitly approved. */
  approvedNewSkillNames?: string[];
  /** When set, agent name is appended to org unit config.linkedAgentNames. */
  orgUnitId?: string;
}

export interface WorkflowStepProposal {
  agentName: string;
  label?: string;
}

export interface WorkflowGapAnalysis {
  missingAgents: string[];
  missingSkills: string[];
  notes: string;
}

export interface WorkflowDraftProposal {
  name: string;
  description: string;
  steps: WorkflowStepProposal[];
}

export interface WorkflowStudioProposal {
  brief: string;
  needsClarification?: boolean;
  questions?: string[];
  workflow?: WorkflowDraftProposal;
  existingAgentNames?: string[];
  gaps?: WorkflowGapAnalysis;
  newAgents?: import("./org-os-types.js").SuggestedAgentDef[];
  newSkills?: NewSkillDraft[];
  mungerReview?: StudioMungerReview;
}

export interface ApplyWorkflowStudioInput {
  proposal: WorkflowStudioProposal;
  approved: boolean;
  approvedNewAgentNames?: string[];
  approvedNewSkillNames?: string[];
}

export interface WorkflowImpactReference {
  kind: "schedule" | "org_unit" | "department" | "office_service" | "product_preset" | "orchestration_preset";
  id?: string;
  name: string;
  detail?: string;
}

export type WorkflowImpactSeverity = "high" | "medium" | "low";

export interface WorkflowImpactRisk {
  severity: WorkflowImpactSeverity;
  code: string;
  message: string;
}

export interface WorkflowImpactReport {
  workflowId: string;
  workflowName: string;
  references: WorkflowImpactReference[];
  risks: WorkflowImpactRisk[];
  activeRunCount: number;
  referenceCount: number;
}

export interface WorkflowEnrichmentProposal extends WorkflowStudioProposal {
  targetWorkflowId: string;
  impact?: WorkflowImpactReport;
  previousStepCount?: number;
}

export interface ApplyWorkflowEnrichmentInput {
  workflowId: string;
  proposal: WorkflowEnrichmentProposal;
  approved: boolean;
  approvedNewAgentNames?: string[];
  approvedNewSkillNames?: string[];
  /** Allow renaming despite name-based reference risks. */
  allowRename?: boolean;
}
