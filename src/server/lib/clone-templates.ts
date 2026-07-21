import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export async function clonePlatformTemplatesToTenant(tenantId: string) {
  const [platformSkills, platformAgents, platformWorkflows] = await Promise.all([
    prisma.skill.findMany({ where: { tenantId: null } }),
    prisma.agent.findMany({
      where: { tenantId: null },
      include: { skills: true },
    }),
    prisma.workflow.findMany({
      where: { tenantId: null },
      include: { steps: true, edges: true },
    }),
  ]);

  const skillIdMap = new Map<string, string>();

  for (const skill of platformSkills) {
    const created = await prisma.skill.create({
      data: {
        tenantId,
        name: skill.name,
        description: skill.description,
        promptContent: skill.promptContent,
        isActive: skill.isActive,
      },
    });
    skillIdMap.set(skill.id, created.id);
  }

  const agentIdMap = new Map<string, string>();

  for (const agent of platformAgents) {
    const created = await prisma.agent.create({
      data: {
        tenantId,
        name: agent.name,
        role: agent.role,
        systemPrompt: agent.systemPrompt,
        provider: agent.provider,
        model: agent.model,
        temperature: agent.temperature,
        isActive: agent.isActive,
      },
    });
    agentIdMap.set(agent.id, created.id);

    for (const link of agent.skills) {
      const mappedSkillId = skillIdMap.get(link.skillId);
      if (!mappedSkillId) continue;
      await prisma.agentSkill.create({
        data: { agentId: created.id, skillId: mappedSkillId },
      });
    }
  }

  for (const workflow of platformWorkflows) {
    const createdWorkflow = await prisma.workflow.create({
      data: {
        tenantId,
        name: workflow.name,
        description: workflow.description,
        isActive: workflow.isActive,
      },
    });

    const stepIdMap = new Map<string, string>();

    for (const step of workflow.steps) {
      const mappedAgentId = agentIdMap.get(step.agentId);
      if (!mappedAgentId) continue;

      const createdStep = await prisma.workflowStep.create({
        data: {
          workflowId: createdWorkflow.id,
          agentId: mappedAgentId,
          stepOrder: step.stepOrder,
          label: step.label,
          positionX: step.positionX,
          positionY: step.positionY,
          inputConfig: step.inputConfig as Prisma.InputJsonValue,
          outputConfig: step.outputConfig as Prisma.InputJsonValue,
        },
      });
      stepIdMap.set(step.id, createdStep.id);
    }

    for (const edge of workflow.edges) {
      const sourceStepId = stepIdMap.get(edge.sourceStepId);
      const targetStepId = stepIdMap.get(edge.targetStepId);
      if (!sourceStepId || !targetStepId) continue;

      await prisma.workflowEdge.create({
        data: {
          workflowId: createdWorkflow.id,
          sourceStepId,
          targetStepId,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        },
      });
    }
  }

  return {
    skills: platformSkills.length,
    agents: platformAgents.length,
    workflows: platformWorkflows.length,
  };
}
