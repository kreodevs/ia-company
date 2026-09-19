import type { WorkflowGraph } from "../types/index.js";
import { FULLSTACK_AGENT_NAME } from "./opencode-workflow.js";

type WorkflowStep = WorkflowGraph["steps"][number];

export function groupStepsByOrder(steps: WorkflowStep[]): WorkflowStep[][] {
  if (steps.length === 0) return [];

  const groups: WorkflowStep[][] = [];
  let batch: WorkflowStep[] = [];
  let currentOrder = steps[0]!.stepOrder;

  for (const step of steps) {
    if (batch.length > 0 && step.stepOrder !== currentOrder) {
      groups.push(batch);
      batch = [];
    }
    batch.push(step);
    currentOrder = step.stepOrder;
  }

  if (batch.length > 0) groups.push(batch);
  return groups;
}

export function canRunStepGroupInParallel(
  steps: WorkflowStep[],
  options?: { implementationMode?: "local" | "opencode"; afterOpencodeDelegation?: boolean },
): boolean {
  if (steps.length <= 1) return false;
  if (options?.implementationMode === "opencode" && !options.afterOpencodeDelegation) {
    return false;
  }
  return !steps.some((step) => step.agent.name === FULLSTACK_AGENT_NAME);
}
