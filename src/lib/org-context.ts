import { prisma } from "./prisma.js";
import { PLATFORM_BUSINESS_TEMPLATES } from "./business-templates.js";
import type { BusinessTemplateDefinition } from "./org-os-types.js";

export interface OrgUnitRuntimeContext {
  orgUnitId: string;
  orgUnitSlug: string;
  orgUnitName: string;
  orgUnitType: string;
  orgUnitConfig: Record<string, unknown>;
  orgUnitDesignMd: string | null;
  orgUnitTokens: Record<string, unknown>;
  suggestedAgentNames: string[];
}

function suggestedAgentsFromTemplate(
  templateDefinition: unknown,
  orgUnitType: string,
): string[] {
  if (templateDefinition && typeof templateDefinition === "object") {
    const def = templateDefinition as BusinessTemplateDefinition;
    if (def.suggestedAgents?.length) {
      return def.suggestedAgents.map((a) => a.name);
    }
  }
  const bundled = PLATFORM_BUSINESS_TEMPLATES.find((t) => t.orgUnitType === orgUnitType);
  return bundled?.definition.suggestedAgents.map((a) => a.name) ?? [];
}

export function resolveOrgUnitAgentBreakdown(org: {
  type: string;
  config: unknown;
  template: { definition: unknown } | null;
}): { templateNames: string[]; linkedNames: string[]; allNames: string[] } {
  const config = (org.config as Record<string, unknown>) ?? {};
  const linkedFromConfig = Array.isArray(config.linkedAgentNames)
    ? config.linkedAgentNames.filter((n): n is string => typeof n === "string")
    : [];

  const templateNames = org.template?.definition
    ? suggestedAgentsFromTemplate(org.template.definition, org.type)
    : suggestedAgentsFromTemplate(null, org.type);

  const linkedNames = linkedFromConfig.filter((name) => !templateNames.includes(name));

  return {
    templateNames,
    linkedNames,
    allNames: [...new Set([...templateNames, ...linkedFromConfig])],
  };
}

export function suggestedAgentsFromOrgRecord(org: {
  type: string;
  config: unknown;
  template: { definition: unknown } | null;
}): string[] {
  return resolveOrgUnitAgentBreakdown(org).allNames;
}

export interface OrgUnitStaffMember {
  name: string;
  role: string | null;
  provisioned: boolean;
  agentId: string | null;
  source: "template" | "added";
}

export interface OrgUnitStaffRoster {
  orgUnitId: string;
  templateRoleCount: number;
  members: OrgUnitStaffMember[];
  availableAgents: Array<{
    id: string;
    name: string;
    role: string;
    otherDepartments: string[];
  }>;
}

export async function getOrgUnitStaffRoster(
  tenantId: string,
  orgUnitId: string,
): Promise<OrgUnitStaffRoster | null> {
  const org = await prisma.orgUnit.findFirst({
    where: { id: orgUnitId, tenantId },
    include: { template: true },
  });
  if (!org) return null;

  const { templateNames, allNames } = resolveOrgUnitAgentBreakdown(org);
  const templateSet = new Set(templateNames);

  const agents = await prisma.agent.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  const agentByName = new Map(agents.map((agent) => [agent.name, agent]));

  const peerOrgUnits = await prisma.orgUnit.findMany({
    where: { tenantId, id: { not: orgUnitId } },
    include: { template: true },
  });

  const otherDepartmentsForAgent = (agentName: string): string[] =>
    peerOrgUnits
      .filter((peer) => resolveOrgUnitAgentBreakdown(peer).allNames.includes(agentName))
      .map((peer) => peer.name);

  const rosterNames = new Set(allNames);
  const members: OrgUnitStaffMember[] = allNames.map((name) => ({
    name,
    role: agentByName.get(name)?.role ?? null,
    provisioned: agentByName.has(name),
    agentId: agentByName.get(name)?.id ?? null,
    source: templateSet.has(name) ? "template" : "added",
  }));

  return {
    orgUnitId: org.id,
    templateRoleCount: templateNames.length,
    members,
    availableAgents: agents
      .filter((agent) => !rosterNames.has(agent.name))
      .map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        otherDepartments: otherDepartmentsForAgent(agent.name),
      })),
  };
}

export function selectOrgAgentsForTask(
  agents: Array<{ id: string; name: string; role: string }>,
  request: string,
  orgUnitType: string,
  maxAgents = 4,
): Array<{ id: string; name: string; role: string }> {
  if (agents.length === 0) return [];
  const text = request.toLowerCase();

  const scoreAgent = (name: string, role: string): number => {
    const n = name.toLowerCase();
    const r = role.toLowerCase();
    let score = 0;

    if (/social|redes|instagram|tiktok|linkedin|lanzamiento|launch|community|calendario|hashtag/.test(text)) {
      if (n.includes("community") || r.includes("community")) score += 4;
      if (n.includes("copy") || r.includes("copy")) score += 2;
      if (n.includes("marketing-strategist") || r.includes("strategist")) score += 2;
    }
    if (/estrateg|strategy|posicion|positioning|marca|brand/.test(text)) {
      if (n.includes("marketing-strategist") || r.includes("strategist")) score += 4;
      if (n.includes("copy") || r.includes("copy")) score += 1;
    }
    if (/diseño|design|visual|creativ|brief/.test(text)) {
      if (n.includes("design") || r.includes("design")) score += 4;
    }
    if (/copy|texto|contenido|content|caption|post/.test(text)) {
      if (n.includes("copy") || r.includes("copy")) score += 4;
    }

    if (orgUnitType === "marketing_agency" && score === 0) {
      if (n.includes("community")) score += 2;
      if (n.includes("marketing-strategist")) score += 2;
      if (n.includes("copy")) score += 1;
    }

    return score;
  };

  const ranked = [...agents].sort(
    (a, b) => scoreAgent(b.name, b.role) - scoreAgent(a.name, a.role),
  );
  const matched = ranked.filter((agent) => scoreAgent(agent.name, agent.role) > 0);
  if (matched.length >= 2) return matched.slice(0, maxAgents);
  if (matched.length === 1) {
    const rest = ranked.filter((agent) => agent.id !== matched[0]!.id);
    return [matched[0]!, ...rest.slice(0, maxAgents - 1)];
  }
  return ranked.slice(0, maxAgents);
}

export async function loadOrgUnitContext(
  tenantId: string,
  orgUnitId: string,
): Promise<OrgUnitRuntimeContext | null> {
  const org = await prisma.orgUnit.findFirst({
    where: { id: orgUnitId, tenantId },
    include: { template: true },
  });
  if (!org) return null;

  const config = (org.config as Record<string, unknown>) ?? {};
  const suggestedAgentNames = suggestedAgentsFromOrgRecord(org);

  return {
    orgUnitId: org.id,
    orgUnitSlug: org.slug,
    orgUnitName: org.name,
    orgUnitType: org.type,
    orgUnitConfig: config,
    orgUnitDesignMd: org.designMd,
    orgUnitTokens: (org.tokens as Record<string, unknown>) ?? {},
    suggestedAgentNames,
  };
}

export function orgContextToInitialMemory(ctx: OrgUnitRuntimeContext): Record<string, unknown> {
  return {
    orgUnitId: ctx.orgUnitId,
    orgUnitSlug: ctx.orgUnitSlug,
    orgUnitName: ctx.orgUnitName,
    orgUnitType: ctx.orgUnitType,
    orgUnitConfig: ctx.orgUnitConfig,
    orgUnitDesignMd: ctx.orgUnitDesignMd,
    orgUnitTokens: ctx.orgUnitTokens,
    orgUnitAgents: ctx.suggestedAgentNames,
  };
}
