import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export type TemplateSyncMode = "merge" | "update";

export interface TemplateSyncStats {
  skills: { added: number; updated: number };
  agents: { added: number; updated: number };
  workflows: { added: number; updated: number };
}

const emptyStats = (): TemplateSyncStats => ({
  skills: { added: 0, updated: 0 },
  agents: { added: 0, updated: 0 },
  workflows: { added: 0, updated: 0 },
});

type PlatformSkill = Awaited<
  ReturnType<typeof prisma.skill.findMany>
>[number];

type PlatformAgent = Awaited<
  ReturnType<
    typeof prisma.agent.findMany<{ include: { skills: true } }>
  >
>[number];

type PlatformWorkflow = Awaited<
  ReturnType<
    typeof prisma.workflow.findMany<{ include: { steps: true; edges: true } }>
  >
>[number];

async function loadPlatformTemplates() {
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

  return { platformSkills, platformAgents, platformWorkflows };
}

async function copyWorkflowGraphToTenant(
  tenantId: string,
  platformWorkflow: PlatformWorkflow,
  agentIdMap: Map<string, string>,
  existingWorkflowId?: string,
) {
  const workflow =
    existingWorkflowId != null
      ? await prisma.workflow.update({
          where: { id: existingWorkflowId },
          data: {
            description: platformWorkflow.description,
            isActive: platformWorkflow.isActive,
          },
        })
      : await prisma.workflow.create({
          data: {
            tenantId,
            name: platformWorkflow.name,
            description: platformWorkflow.description,
            isActive: platformWorkflow.isActive,
          },
        });

  if (existingWorkflowId != null) {
    await prisma.workflowStep.deleteMany({ where: { workflowId: workflow.id } });
  }

  const stepIdMap = new Map<string, string>();

  for (const step of platformWorkflow.steps) {
    const mappedAgentId = agentIdMap.get(step.agentId);
    if (!mappedAgentId) continue;

    const createdStep = await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
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

  for (const edge of platformWorkflow.edges) {
    const sourceStepId = stepIdMap.get(edge.sourceStepId);
    const targetStepId = stepIdMap.get(edge.targetStepId);
    if (!sourceStepId || !targetStepId) continue;

    await prisma.workflowEdge.create({
      data: {
        workflowId: workflow.id,
        sourceStepId,
        targetStepId,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      },
    });
  }

  return workflow.id;
}

async function syncSkillsForTenant(
  tenantId: string,
  platformSkills: PlatformSkill[],
  mode: TemplateSyncMode,
  stats: TemplateSyncStats,
) {
  const tenantSkills = await prisma.skill.findMany({ where: { tenantId } });
  const tenantByName = new Map(tenantSkills.map((skill) => [skill.name, skill]));
  const skillIdMap = new Map<string, string>();

  for (const skill of platformSkills) {
    const existing = tenantByName.get(skill.name);

    if (!existing) {
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
      stats.skills.added++;
      continue;
    }

    skillIdMap.set(skill.id, existing.id);

    if (mode === "update") {
      await prisma.skill.update({
        where: { id: existing.id },
        data: {
          description: skill.description,
          promptContent: skill.promptContent,
          isActive: skill.isActive,
        },
      });
      stats.skills.updated++;
    }
  }

  return skillIdMap;
}

async function syncAgentsForTenant(
  tenantId: string,
  platformAgents: PlatformAgent[],
  skillIdMap: Map<string, string>,
  mode: TemplateSyncMode,
  stats: TemplateSyncStats,
) {
  const tenantAgents = await prisma.agent.findMany({
    where: { tenantId },
    include: { skills: true },
  });
  const tenantByName = new Map(tenantAgents.map((agent) => [agent.name, agent]));
  const agentIdMap = new Map<string, string>();

  for (const agent of platformAgents) {
    const existing = tenantByName.get(agent.name);
    const agentData = {
      role: agent.role,
      systemPrompt: agent.systemPrompt,
      provider: agent.provider,
      model: agent.model,
      temperature: agent.temperature,
      isActive: agent.isActive,
    };

    if (!existing) {
      const created = await prisma.agent.create({
        data: { tenantId, name: agent.name, ...agentData },
      });
      agentIdMap.set(agent.id, created.id);

      for (const link of agent.skills) {
        const mappedSkillId = skillIdMap.get(link.skillId);
        if (!mappedSkillId) continue;
        await prisma.agentSkill.create({
          data: { agentId: created.id, skillId: mappedSkillId },
        });
      }

      stats.agents.added++;
      continue;
    }

    agentIdMap.set(agent.id, existing.id);

    if (mode === "update") {
      await prisma.agent.update({
        where: { id: existing.id },
        data: agentData,
      });

      await prisma.agentSkill.deleteMany({ where: { agentId: existing.id } });
      for (const link of agent.skills) {
        const mappedSkillId = skillIdMap.get(link.skillId);
        if (!mappedSkillId) continue;
        await prisma.agentSkill.create({
          data: { agentId: existing.id, skillId: mappedSkillId },
        });
      }

      stats.agents.updated++;
    }
  }

  return agentIdMap;
}

async function syncWorkflowsForTenant(
  tenantId: string,
  platformWorkflows: PlatformWorkflow[],
  agentIdMap: Map<string, string>,
  mode: TemplateSyncMode,
  stats: TemplateSyncStats,
) {
  const tenantWorkflows = await prisma.workflow.findMany({ where: { tenantId } });
  const tenantByName = new Map(tenantWorkflows.map((workflow) => [workflow.name, workflow]));

  for (const workflow of platformWorkflows) {
    const existing = tenantByName.get(workflow.name);

    if (!existing) {
      await copyWorkflowGraphToTenant(tenantId, workflow, agentIdMap);
      stats.workflows.added++;
      continue;
    }

    if (mode === "update") {
      await copyWorkflowGraphToTenant(tenantId, workflow, agentIdMap, existing.id);
      stats.workflows.updated++;
    }
  }
}

export async function clonePlatformTemplatesToTenant(tenantId: string) {
  const { platformSkills, platformAgents, platformWorkflows } = await loadPlatformTemplates();
  const stats = emptyStats();

  const skillIdMap = await syncSkillsForTenant(tenantId, platformSkills, "merge", stats);
  const agentIdMap = await syncAgentsForTenant(
    tenantId,
    platformAgents,
    skillIdMap,
    "merge",
    stats,
  );
  await syncWorkflowsForTenant(tenantId, platformWorkflows, agentIdMap, "merge", stats);

  return {
    skills: platformSkills.length,
    agents: platformAgents.length,
    workflows: platformWorkflows.length,
  };
}

export async function syncPlatformTemplatesToTenant(
  tenantId: string,
  mode: TemplateSyncMode = "merge",
): Promise<TemplateSyncStats> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const { platformSkills, platformAgents, platformWorkflows } = await loadPlatformTemplates();
  const stats = emptyStats();

  const skillIdMap = await syncSkillsForTenant(tenantId, platformSkills, mode, stats);
  const agentIdMap = await syncAgentsForTenant(
    tenantId,
    platformAgents,
    skillIdMap,
    mode,
    stats,
  );
  await syncWorkflowsForTenant(tenantId, platformWorkflows, agentIdMap, mode, stats);

  return stats;
}

export async function syncPlatformTemplatesToTenants(
  tenantIds: string[],
  mode: TemplateSyncMode = "merge",
) {
  const results: Array<{ tenantId: string; tenantName: string; stats: TemplateSyncStats }> = [];

  for (const tenantId of tenantIds) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) continue;

    const stats = await syncPlatformTemplatesToTenant(tenantId, mode);
    results.push({ tenantId, tenantName: tenant.name, stats });
  }

  return results;
}
