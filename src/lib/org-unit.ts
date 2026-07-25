import type { OrgUnit, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { syncOrgUnitToWorkspace, slugifyOrgName } from "./org-workspace.js";

export function serializeOrgUnit(unit: OrgUnit) {
  return {
    id: unit.id,
    tenantId: unit.tenantId,
    slug: unit.slug,
    name: unit.name,
    description: unit.description,
    type: unit.type,
    templateId: unit.templateId,
    config: unit.config,
    configSchema: unit.configSchema,
    tokens: unit.tokens,
    designMd: unit.designMd,
    isActive: unit.isActive,
    createdAt: unit.createdAt.toISOString(),
    updatedAt: unit.updatedAt.toISOString(),
    workspacePath: `projects/_org/${unit.slug}`,
  };
}

export async function listOrgUnits(tenantId: string) {
  const units = await prisma.orgUnit.findMany({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return units.map(serializeOrgUnit);
}

export async function getOrgUnit(tenantId: string, id: string) {
  const unit = await prisma.orgUnit.findFirst({
    where: { id, tenantId },
  });
  return unit ? serializeOrgUnit(unit) : null;
}

export async function createOrgUnit(
  tenantId: string,
  input: {
    name: string;
    slug?: string;
    description?: string;
    type?: OrgUnit["type"];
    templateId?: string;
    config?: Record<string, unknown>;
    configSchema?: Record<string, unknown>;
    tokens?: Record<string, unknown>;
    designMd?: string;
  },
) {
  const slug = input.slug?.trim() || slugifyOrgName(input.name);
  const existing = await prisma.orgUnit.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
  });
  if (existing) throw new Error(`Org unit slug "${slug}" already exists`);

  const unit = await prisma.orgUnit.create({
    data: {
      tenantId,
      slug,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      type: input.type ?? "custom",
      templateId: input.templateId ?? null,
      config: (input.config ?? {}) as Prisma.InputJsonValue,
      configSchema: (input.configSchema ?? {}) as Prisma.InputJsonValue,
      tokens: (input.tokens ?? {}) as Prisma.InputJsonValue,
      designMd: input.designMd ?? null,
    },
  });

  await syncOrgUnitToWorkspace({
    slug: unit.slug,
    designMd: unit.designMd,
    tokens: unit.tokens as Record<string, unknown>,
  });

  return serializeOrgUnit(unit);
}

export async function updateOrgUnit(
  tenantId: string,
  id: string,
  input: {
    name?: string;
    description?: string;
    config?: Record<string, unknown>;
    tokens?: Record<string, unknown>;
    designMd?: string;
    isActive?: boolean;
  },
) {
  const unit = await prisma.orgUnit.findFirst({ where: { id, tenantId } });
  if (!unit) return null;

  const updated = await prisma.orgUnit.update({
    where: { id },
    data: {
      ...(input.name != null ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.config !== undefined ? { config: input.config as Prisma.InputJsonValue } : {}),
      ...(input.tokens !== undefined ? { tokens: input.tokens as Prisma.InputJsonValue } : {}),
      ...(input.designMd !== undefined ? { designMd: input.designMd || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });

  await syncOrgUnitToWorkspace({
    slug: updated.slug,
    designMd: updated.designMd,
    tokens: updated.tokens as Record<string, unknown>,
  });

  return serializeOrgUnit(updated);
}
