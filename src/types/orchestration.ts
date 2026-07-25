import type { CompanyPhase } from "@prisma/client";

export interface ScheduleConditions {
  pipelineEmpty?: boolean;
  pipelineHasIdeas?: boolean;
  phases?: CompanyPhase[];
  hasBuildingProduct?: boolean;
  hasGrowingProduct?: boolean;
  hasPendingIdea?: boolean;
  noPendingDecisions?: boolean;
  /** When set, schedule only runs if this department has linked work items. */
  orgUnitId?: string;
  /** When true, meta schedule creates in-app suggestion instead of launching a run. */
  suggestOnly?: boolean;
}

export type OrchestrationPresetId =
  | "on_demand"
  | "discovery_only"
  | "light_exploration";

export interface OrchestrationPreviewEntry {
  scheduleId: string;
  scheduleName: string;
  orchestrationMode: "fixed" | "meta_dynamic";
  workflowName: string | null;
  runAt: string;
  conditionsMet: boolean;
  skippedReason?: string;
}
