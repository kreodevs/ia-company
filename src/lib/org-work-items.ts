import type { WorkItemKind } from "@prisma/client";
import { prisma } from "./prisma.js";
import { bootstrapProduct } from "./product-registry.js";
import { serializeTenantProductForClient } from "./product-serializer.js";
import { slugifyOrgName } from "./org-workspace.js";
import { defaultWorkItemKindForOrgType } from "./org-work-item.js";

export async function createOrgWorkItem(
  tenantId: string,
  orgUnit: { id: string; slug: string; name: string },
  input: {
    name: string;
    workItemKind: WorkItemKind;
    description?: string;
    slug?: string;
  },
) {
  const baseSlug = slugifyOrgName(
    input.slug?.trim() || `${orgUnit.slug}-${input.workItemKind}-${input.name}`,
  );
  let slug = baseSlug.slice(0, 64);
  let suffix = 2;
  while (
    await prisma.tenantProduct.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
    })
  ) {
    slug = `${baseSlug.slice(0, Math.max(1, 58 - String(suffix).length))}-${suffix}`;
    suffix += 1;
  }

  const product = await bootstrapProduct({
    tenantId,
    name: input.name.trim(),
    slug,
    description: input.description?.trim() || undefined,
  });
  const updated = await prisma.tenantProduct.update({
    where: { id: product.id },
    data: { orgUnitId: orgUnit.id, workItemKind: input.workItemKind },
  });
  return serializeTenantProductForClient(updated);
}

export async function createDefaultOrgWorkItem(
  tenantId: string,
  orgUnit: { id: string; slug: string; name: string },
  orgUnitType: string,
  workItemKind?: WorkItemKind,
  description?: string,
) {
  const kind = workItemKind ?? defaultWorkItemKindForOrgType(orgUnitType);
  return createOrgWorkItem(tenantId, orgUnit, {
    name: `${orgUnit.name} (${kind})`,
    workItemKind: kind,
    description,
    slug: `${orgUnit.slug}-${kind}`,
  });
}
