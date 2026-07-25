import { prisma } from "./prisma.js";
import type { NewSkillDraft } from "./catalog-studio-types.js";
import type { SuggestedAgentDef } from "./org-os-types.js";

export function slugifyCatalogName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function listTenantSkillsForCatalog(tenantId: string) {
  return prisma.skill.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true },
  });
}

export async function listTenantAgentsForCatalog(tenantId: string) {
  return prisma.agent.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      role: true,
      skills: { include: { skill: { select: { name: true } } } },
    },
  });
}

export async function ensureTenantSkill(
  tenantId: string,
  draft: NewSkillDraft,
): Promise<{ id: string; name: string; created: boolean }> {
  const name = slugifyCatalogName(draft.name);
  const existing = await prisma.skill.findFirst({ where: { tenantId, name } });
  if (existing) {
    return { id: existing.id, name: existing.name, created: false };
  }
  const skill = await prisma.skill.create({
    data: {
      tenantId,
      name,
      description: draft.description.trim(),
      promptContent: draft.promptContent.trim(),
    },
  });
  return { id: skill.id, name: skill.name, created: true };
}

export async function ensureTenantAgents(
  tenantId: string,
  agents: SuggestedAgentDef[],
): Promise<string[]> {
  const created: string[] = [];
  for (const spec of agents) {
    const name = slugifyCatalogName(spec.name);
    const existing = await prisma.agent.findFirst({
      where: { tenantId, name },
    });
    if (existing) {
      created.push(existing.name);
      continue;
    }
    await prisma.agent.create({
      data: {
        tenantId,
        name,
        role: spec.role,
        systemPrompt: spec.systemPrompt,
        isActive: true,
      },
    });
    created.push(name);

    if (spec.skillNames?.length) {
      const agent = await prisma.agent.findFirst({
        where: { tenantId, name },
      });
      if (!agent) continue;
      for (const skillName of spec.skillNames) {
        const skill = await prisma.skill.findFirst({
          where: { tenantId, name: slugifyCatalogName(skillName) },
        });
        if (!skill) continue;
        await prisma.agentSkill.upsert({
          where: { agentId_skillId: { agentId: agent.id, skillId: skill.id } },
          update: {},
          create: { agentId: agent.id, skillId: skill.id },
        });
      }
    }
  }
  return created;
}

export async function linkAgentSkillsByName(
  tenantId: string,
  agentName: string,
  skillNames: string[],
): Promise<void> {
  const agent = await prisma.agent.findFirst({
    where: { tenantId, name: slugifyCatalogName(agentName) },
  });
  if (!agent) return;

  for (const raw of skillNames) {
    const skill = await prisma.skill.findFirst({
      where: { tenantId, name: slugifyCatalogName(raw) },
    });
    if (!skill) continue;
    await prisma.agentSkill.upsert({
      where: { agentId_skillId: { agentId: agent.id, skillId: skill.id } },
      update: {},
      create: { agentId: agent.id, skillId: skill.id },
    });
  }
}

export function collectSkillNamesFromAgents(agents: SuggestedAgentDef[]): string[] {
  const names = new Set<string>();
  for (const agent of agents) {
    for (const raw of agent.skillNames ?? []) {
      names.add(slugifyCatalogName(raw));
    }
  }
  return [...names];
}

export async function findMissingSkillNames(
  tenantId: string,
  skillNames: string[],
): Promise<string[]> {
  if (!skillNames.length) return [];
  const existing = await listTenantSkillsForCatalog(tenantId);
  const known = new Set(existing.map((s) => s.name));
  return skillNames.filter((name) => !known.has(slugifyCatalogName(name)));
}

export async function linkAgentNameToOrgUnit(
  tenantId: string,
  orgUnitId: string,
  agentName: string,
): Promise<void> {
  const org = await prisma.orgUnit.findFirst({
    where: { id: orgUnitId, tenantId },
    select: { id: true, config: true },
  });
  if (!org) throw new Error("Org unit not found");

  const config = (org.config as Record<string, unknown>) ?? {};
  const linked = Array.isArray(config.linkedAgentNames)
    ? config.linkedAgentNames.filter((n): n is string => typeof n === "string").map(slugifyCatalogName)
    : [];
  const name = slugifyCatalogName(agentName);
  if (linked.includes(name)) return;

  await prisma.orgUnit.update({
    where: { id: org.id },
    data: {
      config: {
        ...config,
        linkedAgentNames: [...linked, name],
      },
    },
  });
}
