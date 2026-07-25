import type { WorkItemKind } from "@prisma/client";
import { WORKFLOW_NAMES } from "./workflow-names.js";

/** Map work item + department type to product launch preset id. */
export function presetForOrgWorkItem(
  workItemKind: WorkItemKind,
  orgUnitType: string,
  cycleNumber = 1,
): string {
  if (orgUnitType === "marketing_agency") {
    if (workItemKind === "campaign") return "content-sprint";
    if (workItemKind === "client") return "campaign-launch";
    return cycleNumber % 2 === 0 ? "content-sprint" : "campaign-launch";
  }
  if (workItemKind === "project") return "feature-development";
  if (workItemKind === "campaign") return "marketing-sprint";
  return "marketing-sprint";
}

/** Map work item + department type to platform workflow name (meta cycle). */
export function workflowForOrgWorkItem(
  workItemKind: WorkItemKind,
  orgUnitType: string,
  cycleNumber: number,
): string {
  if (orgUnitType === "marketing_agency") {
    if (workItemKind === "campaign") return WORKFLOW_NAMES.CONTENT_SPRINT;
    if (workItemKind === "client") return WORKFLOW_NAMES.CAMPAIGN_LAUNCH;
    return cycleNumber % 2 === 0
      ? WORKFLOW_NAMES.CONTENT_SPRINT
      : WORKFLOW_NAMES.CAMPAIGN_LAUNCH;
  }
  if (workItemKind === "project") return WORKFLOW_NAMES.FEATURE_DEVELOPMENT;
  if (workItemKind === "campaign") return WORKFLOW_NAMES.MARKETING_SPRINT;
  return WORKFLOW_NAMES.FEATURE_DEVELOPMENT;
}

export function defaultWorkItemKindForOrgType(orgUnitType: string): WorkItemKind {
  return orgUnitType === "marketing_agency" ? "client" : "product";
}
