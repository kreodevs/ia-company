import { prisma } from "./prisma.js";
import {
  deriveAcceptanceCriteria,
  launchOfficeSession,
  type LaunchOfficeSessionResult,
} from "./office-session-launcher.js";
import type { OfficeTaskPlan } from "./office-coordinator.js";
import type { ExecuteWorkflowInput, SharedMemory } from "../types/index.js";

/**
 * Converts a legacy workflow graph into the session runtime's team plan.
 * Steps are ordered by stepOrder and duplicate agents are collapsed so each
 * agent receives one isolated workspace/session per run.
 */
export async function launchWorkflowAsSession(
  workflowId: string,
  input: ExecuteWorkflowInput,
  initialMemory: SharedMemory,
): Promise<LaunchOfficeSessionResult> {
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, ...(input.tenantId ? { tenantId: input.tenantId } : {}) },
    include: {
      steps: {
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { stepOrder: "asc" },
      },
    },
  });
  if (!workflow) throw new Error("Workflow not found");
  if (!input.tenantId) throw new Error("Session workflow launches require a tenant context");

  const seen = new Set<string>();
  const agents = workflow.steps
    .filter((step) => step.agent && !seen.has(step.agent.id))
    .map((step) => {
      seen.add(step.agent!.id);
      const agent = step.agent!;
      return {
        id: agent.id,
        name: agent.name,
        role: agent.role ?? agent.name,
        reasonKey: "workflow-step",
        acceptanceCriteria: [],
        budgets: { maxTurns: 25, budgetTokens: 150_000, budgetUsd: 5 },
      };
    });

  if (agents.length === 0) throw new Error("Workflow has no agents and cannot launch a session");

  const request =
    typeof initialMemory.task === "string" && initialMemory.task.trim()
      ? initialMemory.task
      : workflow.description?.trim() || workflow.name;
  const plan: OfficeTaskPlan = {
    planId: `workflow-session:${workflow.id}`,
    request,
    summary: workflow.description ?? workflow.name,
    coordinatorNoteKey: "workflow-session-bridge",
    agents,
    missingAgentRoles: [],
    workflowId: workflow.id,
    workflowName: workflow.name,
    presetId: null,
    productId: input.productId ?? null,
    productName: null,
    deliverableKey: "workflow-session-deliverables",
    estimatedCostUsd: { min: agents.length, max: agents.length * 5 },
    estimatedMinutes: { min: agents.length * 2, max: agents.length * 10 },
    mode: agents.length === 1 ? "single" : "workflow",
    serviceId: null,
    procedureLabel: workflow.name,
    stepCount: workflow.steps.length,
  };

  const agentOverrides = Object.fromEntries(
    agents.map((agent) => [
      agent.name,
      {
        acceptanceCriteria: deriveAcceptanceCriteria(plan, agent),
        goal: `${request}\n\nYou are contributing as ${agent.role}. Preserve useful context from the shared memory and leave your concrete deliverable in the workspace.`,
      },
    ]),
  );

  return launchOfficeSession({
    tenantId: input.tenantId,
    plan,
    request,
    productId: input.productId ?? null,
    productSlug: input.productSlug ?? null,
    initialMemory,
    agentOverrides,
  });
}

export function sessionInitialMemory(input: ExecuteWorkflowInput, mergedMemory: SharedMemory): SharedMemory {
  return {
    ...mergedMemory,
    ...(input.productSlug ? { focusProductSlug: input.productSlug } : {}),
    ...(input.productId ? { productId: input.productId } : {}),
  };
}

export function workflowSessionRequest(workflowName: string, memory: SharedMemory): string {
  return typeof memory.task === "string" && memory.task.trim() ? memory.task : workflowName;
}