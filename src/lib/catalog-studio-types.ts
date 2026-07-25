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

export interface AgentStudioProposal {
  brief: string;
  reuse?: AgentReuseSuggestion;
  agent?: SuggestedAgentDef;
  /** Existing tenant skill names to link (must exist at apply time). */
  existingSkillNames: string[];
  /** New skills — only created if listed in `approvedNewSkillNames` on apply. */
  newSkills: NewSkillDraft[];
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
