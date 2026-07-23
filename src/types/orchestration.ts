import type { CompanyPhase } from "@prisma/client";

export interface ScheduleConditions {
  pipelineEmpty?: boolean;
  pipelineHasIdeas?: boolean;
  phases?: CompanyPhase[];
  hasBuildingProduct?: boolean;
  hasGrowingProduct?: boolean;
  hasPendingIdea?: boolean;
  noPendingDecisions?: boolean;
}

export type OrchestrationPresetId =
  | "discovery_only"
  | "light_exploration"
  | "full_autonomous";

export interface OrchestrationPreviewEntry {
  scheduleId: string;
  scheduleName: string;
  orchestrationMode: "fixed" | "meta_dynamic";
  workflowName: string | null;
  runAt: string;
  conditionsMet: boolean;
  skippedReason?: string;
}
