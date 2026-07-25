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
  const linkedFromConfig = Array.isArray(config.linkedAgentNames)
    ? config.linkedAgentNames.filter((n): n is string => typeof n === "string")
    : [];

  const fromTemplate = org.template?.definition
    ? suggestedAgentsFromTemplate(org.template.definition, org.type)
    : suggestedAgentsFromTemplate(null, org.type);

  const suggestedAgentNames = [...new Set([...fromTemplate, ...linkedFromConfig])];

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
