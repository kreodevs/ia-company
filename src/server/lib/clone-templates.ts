import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { getPlatformSettingsSync } from "../../lib/platform-settings.js";
import { findTenantTemplateMatch } from "./template-match.js";

export type TemplateSyncMode = "merge" | "update";

export interface TemplateSyncStats {
  skills: { added: number; updated: number; linked: number };
  agents: { added: number; updated: number; linked: number };
  workflows: { added: number; updated: number; linked: number };
}

const emptyStats = (): TemplateSyncStats => ({
  skills: { added: 0, updated: 0, linked: 0 },
  agents: { added: 0, updated: 0, linked: 0 },
  workflows: { added: 0, updated: 0, linked: 0 },
});

type PlatformSkill = Awaited<ReturnType<typeof prisma.skill.findMany>>[number];

type PlatformAgent = Awaited<
  ReturnType<typeof prisma.agent.findMany<{ include: { skills: true } }>>
>[number];

type PlatformWorkflow = Awaited<
  ReturnType<typeof prisma.workflow.findMany<{ include: { steps: true; edges: true } }>>
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
  const workflowData = {
    name: platformWorkflow.name,
    description: platformWorkflow.description,
    isActive: platformWorkflow.isActive,
    platformSourceId: platformWorkflow.id,
  };

  const workflow =
    existingWorkflowId != null
      ? await prisma.workflow.update({
          where: { id: existingWorkflowId },
          data: workflowData,
        })
      : await prisma.workflow.create({
          data: { tenantId, ...workflowData },
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
  const skillIdMap = new Map<string, string>();

  for (const skill of platformSkills) {
    const existing = findTenantTemplateMatch(tenantSkills, skill.id, skill.name);
    const contentFields = {
      name: skill.name,
      description: skill.description,
      promptContent: skill.promptContent,
      isActive: skill.isActive,
      platformSourceId: skill.id,
    };

    if (!existing) {
      const created = await prisma.skill.create({
        data: { tenantId, ...contentFields },
      });
      skillIdMap.set(skill.id, created.id);
      stats.skills.added++;
      continue;
    }

    skillIdMap.set(skill.id, existing.id);

    if (!existing.platformSourceId) {
      await prisma.skill.update({
        where: { id: existing.id },
        data: { platformSourceId: skill.id },
      });
      stats.skills.linked++;
    }

    if (mode === "update") {
      await prisma.skill.update({
        where: { id: existing.id },
        data: contentFields,
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
  const agentIdMap = new Map<string, string>();

  for (const agent of platformAgents) {
    const existing = findTenantTemplateMatch(tenantAgents, agent.id, agent.name);
    const platformLlm = getPlatformSettingsSync();
    const agentData = {
      name: agent.name,
      role: agent.role,
      systemPrompt: agent.systemPrompt,
      provider: platformLlm.defaultProvider,
      model: platformLlm.defaultModel,
      temperature: agent.temperature,
      isActive: agent.isActive,
      platformSourceId: agent.id,
    };

    if (!existing) {
      const created = await prisma.agent.create({
        data: { tenantId, ...agentData },
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

    if (!existing.platformSourceId) {
      await prisma.agent.update({
        where: { id: existing.id },
        data: { platformSourceId: agent.id },
      });
      stats.agents.linked++;
    }

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

  for (const workflow of platformWorkflows) {
    const existing = findTenantTemplateMatch(tenantWorkflows, workflow.id, workflow.name);

    if (!existing) {
      await copyWorkflowGraphToTenant(tenantId, workflow, agentIdMap);
      stats.workflows.added++;
      continue;
    }

    if (!existing.platformSourceId) {
      await prisma.workflow.update({
        where: { id: existing.id },
        data: { platformSourceId: workflow.id },
      });
      stats.workflows.linked++;
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

/** Ensures a platform workflow exists on the tenant (copies from platform template if missing). */
export async function ensurePlatformWorkflowOnTenant(tenantId: string, workflowName: string) {
  const existing = await prisma.workflow.findFirst({
    where: { tenantId, name: workflowName },
    select: { id: true, name: true, description: true },
  });
  if (existing) return existing;

  const platformWorkflow = await prisma.workflow.findFirst({
    where: { tenantId: null, name: workflowName },
    include: { steps: true, edges: true },
  });
  if (!platformWorkflow) return null;

  const [platformAgents, tenantAgents] = await Promise.all([
    prisma.agent.findMany({ where: { tenantId: null } }),
    prisma.agent.findMany({ where: { tenantId } }),
  ]);
  const platformAgentById = new Map(platformAgents.map((a) => [a.id, a]));
  const tenantAgentByName = new Map(tenantAgents.map((a) => [a.name, a.id]));

  const agentIdMap = new Map<string, string>();
  for (const step of platformWorkflow.steps) {
    const platformAgent = platformAgentById.get(step.agentId);
    if (!platformAgent) continue;
    const tenantAgentId = tenantAgentByName.get(platformAgent.name);
    if (tenantAgentId) agentIdMap.set(step.agentId, tenantAgentId);
  }

  const workflowId = await copyWorkflowGraphToTenant(tenantId, platformWorkflow, agentIdMap);
  return prisma.workflow.findUnique({
    where: { id: workflowId },
    select: { id: true, name: true, description: true },
  });
}

/** Creates or returns a single-step workflow for one agent task on a product. */
export async function ensureAgentTaskWorkflow(tenantId: string, agentId: string) {
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, tenantId },
    select: { id: true, name: true, role: true },
  });
  if (!agent) return null;

  const wfName = `_agent-${agent.name}`;
  const existing = await prisma.workflow.findFirst({
    where: { tenantId, name: wfName },
    select: { id: true, name: true, description: true },
  });
  if (existing) return existing;

  const workflow = await prisma.workflow.create({
    data: {
      tenantId,
      name: wfName,
      description: `Single-agent task: ${agent.role}`,
      isActive: true,
    },
    select: { id: true, name: true, description: true },
  });

  await prisma.workflowStep.create({
    data: {
      workflowId: workflow.id,
      agentId: agent.id,
      stepOrder: 0,
      label: agent.role,
    },
  });

  return workflow;
}

/** Creates or returns a multi-step workflow for a temporary agent team. */
export async function ensureTeamTaskWorkflow(
  tenantId: string,
  agentIds: string[],
  taskLabel: string,
) {
  const agents = await prisma.agent.findMany({
    where: { id: { in: agentIds }, tenantId },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  if (agents.length === 0) return null;

  const slug = agents.map((a) => a.name).join("-");
  const wfName = `_team-${slug}`.slice(0, 120);
  const existing = await prisma.workflow.findFirst({
    where: { tenantId, name: wfName },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  if (existing && existing.steps.length === agents.length) {
    const existingIds = existing.steps.map((s) => s.agentId).sort().join(",");
    const requestedIds = agents.map((a) => a.id).sort().join(",");
    if (existingIds === requestedIds) {
      return {
        id: existing.id,
        name: existing.name,
        description: existing.description,
      };
    }
  }

  if (existing) {
    await prisma.workflowStep.deleteMany({ where: { workflowId: existing.id } });
    for (let i = 0; i < agents.length; i++) {
      await prisma.workflowStep.create({
        data: {
          workflowId: existing.id,
          agentId: agents[i]!.id,
          stepOrder: i,
          label: agents[i]!.role,
        },
      });
    }
    await prisma.workflow.update({
      where: { id: existing.id },
      data: { description: `Team task: ${taskLabel}` },
    });
    return { id: existing.id, name: existing.name, description: existing.description };
  }

  const workflow = await prisma.workflow.create({
    data: {
      tenantId,
      name: wfName,
      description: `Team task: ${taskLabel}`,
      isActive: true,
    },
    select: { id: true, name: true, description: true },
  });

  for (let i = 0; i < agents.length; i++) {
    await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
        agentId: agents[i]!.id,
        stepOrder: i,
        label: agents[i]!.role,
      },
    });
  }

  return workflow;
}
