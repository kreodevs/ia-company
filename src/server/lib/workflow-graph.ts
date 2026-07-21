import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "./request-context.js";
import type { CreateWorkflowInput } from "../../types/index.js";

type StepInput = NonNullable<CreateWorkflowInput["steps"]>[number];
type EdgeInput = NonNullable<CreateWorkflowInput["edges"]>[number];

export async function updateWorkflowGraph(
  workflowId: string,
  input: {
    name?: string;
    description?: string;
    isActive?: boolean;
    steps?: StepInput[];
    edges?: EdgeInput[];
  },
  options?: {
    validateAgentId?: (agentId: string) => Promise<void>;
  },
) {
  const { steps, edges, ...data } = input;

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.workflow.update({ where: { id: workflowId }, data });
    }

    if (!steps) return;

    for (const step of steps) {
      await options?.validateAgentId?.(step.agentId);
    }

    const incomingIds = steps
      .map((s) => s.id)
      .filter((id): id is string => Boolean(id && !id.startsWith("temp-")));

    if (incomingIds.length > 0) {
      await tx.workflowStep.deleteMany({
        where: { workflowId, id: { notIn: incomingIds } },
      });
    } else {
      await tx.workflowStep.deleteMany({ where: { workflowId } });
    }

    const idMap = new Map<string, string>();

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const stepData = {
        agentId: s.agentId,
        stepOrder: s.stepOrder ?? i,
        label: s.label,
        positionX: s.positionX ?? 250,
        positionY: s.positionY ?? i * 150,
        inputConfig: (s.inputConfig ?? { passSharedMemory: true }) as Prisma.InputJsonValue,
        outputConfig: (s.outputConfig ?? { appendToSharedMemory: true }) as Prisma.InputJsonValue,
      };

      if (s.id && !s.id.startsWith("temp-")) {
        const updated = await tx.workflowStep.update({
          where: { id: s.id },
          data: stepData,
        });
        idMap.set(s.id, updated.id);
      } else {
        const created = await tx.workflowStep.create({
          data: { workflowId, ...stepData },
        });
        if (s.id) idMap.set(s.id, created.id);
      }
    }

    if (edges) {
      await tx.workflowEdge.deleteMany({ where: { workflowId } });
      if (edges.length > 0) {
        await tx.workflowEdge.createMany({
          data: edges.map((e) => ({
            workflowId,
            sourceStepId: idMap.get(e.sourceStepId) ?? e.sourceStepId,
            targetStepId: idMap.get(e.targetStepId) ?? e.targetStepId,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
        });
      }
    }
  });

  return prisma.workflow.findUnique({
    where: { id: workflowId },
    include: {
      steps: { include: { agent: true }, orderBy: { stepOrder: "asc" } },
      edges: true,
    },
  });
}

export async function assertPlatformAgent(agentId: string): Promise<void> {
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, tenantId: null },
  });
  if (!agent) {
    throw new HttpError(400, "Step agent must be a platform template agent");
  }
}
