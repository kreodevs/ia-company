import type { Workflow, WorkflowStep } from "./api";
import i18n from "../i18n/index.js";

export function sortWorkflowSteps(steps: WorkflowStep[]): WorkflowStep[] {
  return [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
}

export function stepDisplayName(step: WorkflowStep): string {
  return (
    step.label?.trim() ||
    step.agent?.role?.trim() ||
    step.agent?.name ||
    i18n.t("workflowDisplay.step")
  );
}

export function workflowPipelineSteps(workflow: Workflow, limit = 8): WorkflowStep[] {
  return sortWorkflowSteps(workflow.steps).slice(0, limit);
}

export function formatWorkflowTitle(name: string): string {
  if (name.includes(" ")) return name;
  return name
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
