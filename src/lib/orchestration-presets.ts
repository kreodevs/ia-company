import type { OrchestrationPresetId } from "../types/orchestration.js";
import type { ScheduleConditions } from "../types/orchestration.js";
import { WORKFLOW_NAMES } from "./workflow-names.js";

export interface OrchestrationPresetRule {
  name: string;
  orchestrationMode: "fixed" | "meta_dynamic";
  workflowName?: string;
  intervalSec?: number;
  cronExpr?: string;
  priority: number;
  enabled: boolean;
  conditions?: ScheduleConditions;
}

export interface OrchestrationPreset {
  id: OrchestrationPresetId;
  labelKey: string;
  descriptionKey: string;
  rules: OrchestrationPresetRule[];
}

export const ORCHESTRATION_PRESETS: Record<OrchestrationPresetId, OrchestrationPreset> = {
  on_demand: {
    id: "on_demand",
    labelKey: "settings.orchestration.presets.onDemand.label",
    descriptionKey: "settings.orchestration.presets.onDemand.description",
    rules: [],
  },
  discovery_only: {
    id: "discovery_only",
    labelKey: "settings.orchestration.presets.discoveryOnly.label",
    descriptionKey: "settings.orchestration.presets.discoveryOnly.description",
    rules: [
      {
        name: "Discovery semanal",
        orchestrationMode: "fixed",
        workflowName: WORKFLOW_NAMES.OPPORTUNITY_DISCOVERY,
        cronExpr: "0 9 * * 6",
        intervalSec: 604800,
        priority: 10,
        enabled: true,
        conditions: { pipelineEmpty: true, noPendingDecisions: true },
      },
    ],
  },
  light_exploration: {
    id: "light_exploration",
    labelKey: "settings.orchestration.presets.lightExploration.label",
    descriptionKey: "settings.orchestration.presets.lightExploration.description",
    rules: [
      {
        name: "Discovery semanal",
        orchestrationMode: "fixed",
        workflowName: WORKFLOW_NAMES.OPPORTUNITY_DISCOVERY,
        cronExpr: "0 9 * * 6",
        intervalSec: 604800,
        priority: 10,
        enabled: true,
        conditions: { pipelineEmpty: true },
      },
      {
        name: "Evaluación de ideas",
        orchestrationMode: "fixed",
        workflowName: WORKFLOW_NAMES.NEW_PRODUCT_EVALUATION,
        intervalSec: 259200,
        priority: 20,
        enabled: true,
        conditions: { hasPendingIdea: true, noPendingDecisions: true },
      },
      {
        name: "Revisión semanal",
        orchestrationMode: "fixed",
        workflowName: WORKFLOW_NAMES.WEEKLY_REVIEW,
        cronExpr: "0 9 * * 1",
        intervalSec: 604800,
        priority: 5,
        enabled: true,
      },
    ],
  },
};

export function isOrchestrationPresetId(value: string): value is OrchestrationPresetId {
  return value in ORCHESTRATION_PRESETS;
}
