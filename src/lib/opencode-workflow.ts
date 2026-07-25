import type { WorkflowGraph } from "../types/index.js";

export const FULLSTACK_AGENT_NAME = "fullstack-dhh";

type WorkflowStepLike = {
  agent: { name: string };
  stepOrder: number;
};

export function resolveFullstackStepOrder(steps: WorkflowStepLike[]): number | null {
  const fullstack = steps.find((step) => step.agent.name === FULLSTACK_AGENT_NAME);
  return fullstack?.stepOrder ?? null;
}

/** Step order to resume at after OpenCode completes (first step after fullstack). */
export function resolveResumeAfterFullstackStepOrder(
  steps: WorkflowStepLike[],
  explicit?: number,
): number {
  if (explicit != null && explicit > 0) return explicit;
  const fullstackOrder = resolveFullstackStepOrder(steps);
  return fullstackOrder != null ? fullstackOrder + 1 : 4;
}

export function workflowHasFullstackStep(workflow: WorkflowGraph): boolean {
  return workflow.steps.some((step) => step.agent.name === FULLSTACK_AGENT_NAME);
}

export function shouldUseReadonlyToolsAfterOpencode(
  stepOrder: number | undefined,
  fullstackStepOrder: number | null,
): boolean {
  if (fullstackStepOrder == null || stepOrder == null) return false;
  return stepOrder > fullstackStepOrder;
}
