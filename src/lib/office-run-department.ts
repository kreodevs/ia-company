import type { Prisma } from "@prisma/client";
import type { SharedMemory } from "../types/index.js";

export function readMemoryOrgUnitId(memory: unknown): string | null {
  if (!memory || typeof memory !== "object") return null;
  const id = (memory as { orgUnitId?: unknown }).orgUnitId;
  return typeof id === "string" && id.trim() ? id : null;
}

export function agentNamesFromWorkflowSteps(
  steps: Array<{ agent: { name: string } | null }>,
): string[] {
  return [
    ...new Set(
      steps
        .map((step) => step.agent?.name)
        .filter((name): name is string => typeof name === "string" && name.length > 0),
    ),
  ];
}

/** Unified team roster for a run: explicit teamAgents, step history, and workflow steps. */
export function extractRunTeamAgentNames(
  memory: unknown,
  workflowAgentNames: string[] = [],
): string[] {
  const mem = (memory ?? {}) as SharedMemory;
  const names = new Set<string>();

  if (Array.isArray(mem.teamAgents)) {
    for (const name of mem.teamAgents) {
      if (typeof name === "string" && name.trim()) names.add(name);
    }
  }

  const history = Array.isArray(mem._history) ? mem._history : [];
  for (const entry of history) {
    if (typeof entry.agentName === "string" && entry.agentName.trim()) {
      names.add(entry.agentName);
    }
  }

  for (const name of workflowAgentNames) {
    if (name.trim()) names.add(name);
  }

  return [...names];
}

export function runBelongsToDepartmentRoster(input: {
  sharedMemory: unknown;
  rosterNames: string[];
  orgUnitId?: string | null;
  workflowAgentNames?: string[];
}): boolean {
  const roster = new Set(input.rosterNames);
  if (!roster.size && !input.orgUnitId) return false;

  if (input.orgUnitId && readMemoryOrgUnitId(input.sharedMemory) === input.orgUnitId) {
    return true;
  }

  const team = extractRunTeamAgentNames(input.sharedMemory, input.workflowAgentNames ?? []);
  return team.some((name) => roster.has(name));
}

/** Narrow tenant run queries before in-memory department filtering. */
export function buildDepartmentRunScopeWhere(input: {
  orgUnitId?: string | null;
  rosterNames?: string[];
}): Prisma.ExecutionRunWhereInput | null {
  if (input.orgUnitId) {
    return {
      OR: [
        { orgUnitId: input.orgUnitId },
        { sharedMemory: { path: ["orgUnitId"], equals: input.orgUnitId } },
      ],
    };
  }
  if (input.rosterNames?.length) {
    return {
      workflow: {
        steps: {
          some: {
            agent: { name: { in: input.rosterNames } },
          },
        },
      },
    };
  }
  return null;
}

export function officeLaunchMemoryFields(input: {
  task: string;
  teamAgentNames: string[];
  coordinatorNote?: string;
}): Record<string, unknown> {
  return {
    task: input.task,
    nextAction: input.task,
    officeRequest: input.task,
    teamAgents: input.teamAgentNames,
    ...(input.coordinatorNote ? { coordinatorNote: input.coordinatorNote } : {}),
  };
}
