import type { OrgUnitType } from "@prisma/client";
import { prisma } from "./prisma.js";
import { PLATFORM_BUSINESS_TEMPLATES } from "./business-templates.js";
import { createOrgUnit } from "./org-unit.js";
import { slugifyOrgName } from "./org-workspace.js";
import type {
  BusinessTemplateDefinition,
  OrgStudioProposal,
  SuggestedAgentDef,
} from "./org-os-types.js";

export async function seedBusinessTemplates(): Promise<number> {
  let count = 0;
  for (const tpl of PLATFORM_BUSINESS_TEMPLATES) {
    await prisma.businessTemplate.upsert({
      where: { slug: tpl.slug },
      update: {
        name: tpl.name,
        description: tpl.description,
        orgUnitType: tpl.orgUnitType,
        definition: tpl.definition as object,
        isActive: true,
      },
      create: {
        slug: tpl.slug,
        name: tpl.name,
        description: tpl.description,
        orgUnitType: tpl.orgUnitType,
        definition: tpl.definition as object,
      },
    });
    count += 1;
  }
  return count;
}

export async function listBusinessTemplates() {
  if (process.env.DATABASE_URL) {
    await seedBusinessTemplates();
    const rows = await prisma.businessTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      orgUnitType: r.orgUnitType,
      artifactTypes: (r.definition as BusinessTemplateDefinition).artifactTypes ?? [],
    }));
  }

  return PLATFORM_BUSINESS_TEMPLATES.map((tpl) => ({
    id: tpl.slug,
    slug: tpl.slug,
    name: tpl.name,
    description: tpl.description,
    orgUnitType: tpl.orgUnitType,
    artifactTypes: tpl.definition.artifactTypes ?? [],
  }));
}

function getBundledTemplate(slug: string) {
  const tpl = PLATFORM_BUSINESS_TEMPLATES.find((t) => t.slug === slug);
  if (!tpl) return null;
  return {
    slug: tpl.slug,
    name: tpl.name,
    orgUnitType: tpl.orgUnitType,
    definition: tpl.definition,
  };
}

async function loadTemplate(slug: string) {
  if (process.env.DATABASE_URL) {
    await seedBusinessTemplates();
    const row = await prisma.businessTemplate.findUnique({ where: { slug } });
    if (row) return row;
  }
  return getBundledTemplate(slug);
}

function mergeConfigDefaults(
  def: BusinessTemplateDefinition,
  description?: string,
): Record<string, unknown> {
  const config = { ...def.configDefaults };
  if (description?.trim()) {
    config.orgMission = description.trim();
  }
  return config;
}

function buildProposalFromTemplate(
  tpl: {
    slug: string;
    name: string;
    orgUnitType: OrgUnitType;
    definition: unknown;
  },
  input: { name?: string; description?: string },
): OrgStudioProposal {
  const def = tpl.definition as BusinessTemplateDefinition;
  const suggestedName = input.name?.trim() || tpl.name;
  const suggestedSlug = slugifyOrgName(suggestedName);

  let summary = `Department based on template "${tpl.name}".`;
  if (input.description?.trim()) {
    summary += ` Mission: ${input.description.trim().slice(0, 200)}`;
  }
  summary += ` Includes ${def.suggestedAgents.length} suggested agent role(s).`;

  return {
    templateSlug: tpl.slug,
    templateName: tpl.name,
    orgUnitType: tpl.orgUnitType,
    suggestedName,
    suggestedSlug,
    description: input.description?.trim() || tpl.name,
    configSchema: def.configSchema,
    configDefaults: mergeConfigDefaults(def, input.description),
    tokens: def.tokens,
    designMd: def.designMd,
    suggestedAgents: def.suggestedAgents,
    suggestedWorkflows: def.suggestedWorkflows ?? [],
    artifactTypes: def.artifactTypes ?? [],
    summary,
  };
}

export async function proposeOrgUnit(input: {
  templateSlug?: string;
  name?: string;
  description?: string;
}): Promise<OrgStudioProposal> {
  const slug = input.templateSlug?.trim() || "marketing-agency";
  const tpl = await loadTemplate(slug);
  if (!tpl) throw new Error(`Template "${slug}" not found`);
  return buildProposalFromTemplate(tpl, input);
}

async function ensureTenantAgents(
  tenantId: string,
  agents: SuggestedAgentDef[],
): Promise<string[]> {
  const created: string[] = [];
  for (const spec of agents) {
    const existing = await prisma.agent.findFirst({
      where: { tenantId, name: spec.name },
    });
    if (existing) {
      created.push(existing.name);
      continue;
    }
    await prisma.agent.create({
      data: {
        tenantId,
        name: spec.name,
        role: spec.role,
        systemPrompt: spec.systemPrompt,
        isActive: true,
      },
    });
    created.push(spec.name);

    if (spec.skillNames?.length) {
      const agent = await prisma.agent.findFirst({
        where: { tenantId, name: spec.name },
      });
      if (!agent) continue;
      for (const skillName of spec.skillNames) {
        const skill = await prisma.skill.findFirst({
          where: {
            name: skillName,
            OR: [{ tenantId }, { tenantId: null }],
          },
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

export async function applyOrgStudioProposal(
  tenantId: string,
  proposal: OrgStudioProposal,
  overrides?: { name?: string; slug?: string; config?: Record<string, unknown> },
) {
  const tpl = await loadTemplate(proposal.templateSlug);
  const unit = await createOrgUnit(tenantId, {
    name: overrides?.name?.trim() || proposal.suggestedName,
    slug: overrides?.slug?.trim() || proposal.suggestedSlug,
    description: proposal.description,
    type: proposal.orgUnitType as OrgUnitType,
    templateId: tpl && "id" in tpl ? tpl.id : undefined,
    config: overrides?.config ?? proposal.configDefaults,
    configSchema: proposal.configSchema as Record<string, unknown>,
    tokens: proposal.tokens,
    designMd: proposal.designMd,
  });

  const agentsCreated = await ensureTenantAgents(tenantId, proposal.suggestedAgents);

  return {
    orgUnit: unit,
    agentsCreated,
  };
}
