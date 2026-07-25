import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export interface ProductIntegrations {
  theforge?: { projectId?: string };
  stripe?: { webhookSecret?: string };
  waitlist?: { enabled?: boolean };
  support?: { ragMcpServerSlug?: string };
  desk?: { autoDispatchSpec?: boolean };
}

export function parseProductIntegrations(metadata: unknown): ProductIntegrations {
  if (!metadata || typeof metadata !== "object") return {};
  const root = metadata as Record<string, unknown>;
  const integrations = root.integrations;
  if (!integrations || typeof integrations !== "object") return {};
  return integrations as ProductIntegrations;
}

export function mergeProductIntegrations(
  metadata: unknown,
  patch: ProductIntegrations,
): Prisma.InputJsonValue {
  const base =
    metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
  const current = parseProductIntegrations(metadata);
  return {
    ...base,
    integrations: {
      ...current,
      ...patch,
      theforge: { ...current.theforge, ...patch.theforge },
      stripe: { ...current.stripe, ...patch.stripe },
      waitlist: { ...current.waitlist, ...patch.waitlist },
      support: { ...current.support, ...patch.support },
      desk: { ...current.desk, ...patch.desk },
    },
  } as Prisma.InputJsonValue;
}

export async function getProductIntegrations(productId: string): Promise<ProductIntegrations> {
  const product = await prisma.tenantProduct.findUnique({
    where: { id: productId },
    select: { metadata: true },
  });
  return parseProductIntegrations(product?.metadata);
}

export const PRODUCT_INTEGRATIONS_SCHEMA = {
  sections: [
    {
      title: "Integrations",
      description: "Connect external systems. Agents use these via MCP and webhooks.",
      fields: [
        {
          name: "theforgeProjectId",
          label: "TheForge project ID",
          type: "text",
          placeholder: "project uuid",
          helpText: "Links TheForge MCP sync to this product desk.",
        },
        {
          name: "supportRagMcpSlug",
          label: "Support RAG MCP server slug",
          type: "text",
          placeholder: "support-rag",
          helpText: "Tenant MCP server slug for product support knowledge base.",
        },
        {
          name: "autoDispatchSpec",
          label: "Auto-dispatch approved specs to dev",
          type: "switch",
          helpText: "When enabled, approving a spec automatically sends it to fullstack-dhh.",
        },
      ],
    },
  ],
} as const;

export function integrationsFormToPatch(form: Record<string, unknown>): ProductIntegrations {
  const theforgeProjectId =
    typeof form.theforgeProjectId === "string" ? form.theforgeProjectId.trim() : "";
  const supportRagMcpSlug =
    typeof form.supportRagMcpSlug === "string" ? form.supportRagMcpSlug.trim() : "";
  const autoDispatchSpec = form.autoDispatchSpec === true || form.autoDispatchSpec === "true";

  const patch: ProductIntegrations = { desk: { autoDispatchSpec } };
  if (theforgeProjectId) patch.theforge = { projectId: theforgeProjectId };
  if (supportRagMcpSlug) patch.support = { ragMcpServerSlug: supportRagMcpSlug };
  return patch;
}

export function integrationsToFormValues(integrations: ProductIntegrations): Record<string, string | boolean> {
  return {
    theforgeProjectId: integrations.theforge?.projectId ?? "",
    supportRagMcpSlug: integrations.support?.ragMcpServerSlug ?? "",
    autoDispatchSpec: integrations.desk?.autoDispatchSpec ?? false,
  };
}
