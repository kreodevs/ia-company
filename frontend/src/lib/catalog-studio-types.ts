export interface StudioMungerReview {
  approved: boolean;
  notes: string;
  veto?: { by: string; reason: string };
}

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
  reuse?: SkillReuseSuggestion;
  skill?: NewSkillDraft;
  mungerReview?: StudioMungerReview;
}

export interface AgentReuseSuggestion {
  existingAgentId: string;
  existingAgentName: string;
  reason: string;
}

export interface McpGrantProposal {
  serverId: string;
  serverSlug: string;
  serverName: string;
  toolNames: string[] | null;
  reason: string;
}

export interface AgentStudioProposal {
  brief: string;
  reuse?: AgentReuseSuggestion;
  agent?: {
    name: string;
    role: string;
    systemPrompt: string;
    skillNames?: string[];
  };
  existingSkillNames: string[];
  newSkills: NewSkillDraft[];
  mcpGrants?: McpGrantProposal[];
  mungerReview?: StudioMungerReview;
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
  newAgents?: Array<{
    name: string;
    role: string;
    systemPrompt: string;
    skillNames?: string[];
  }>;
  newSkills?: NewSkillDraft[];
  mungerReview?: StudioMungerReview;
}
