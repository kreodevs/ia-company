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
  mungerReview?: StudioMungerReview;
}
