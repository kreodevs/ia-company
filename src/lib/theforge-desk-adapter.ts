/**
 * TheForge MCP → Product Desk adapter.
 * Normalizes external specs/tasks into desk items (draft).
 */
import type { DeskItemType } from "@prisma/client";
import { createDeskItem } from "./product-desk.js";
import { getProductIntegrations } from "./product-integrations.js";

export interface TheForgeDeskSyncResult {
  created: number;
  skipped: boolean;
  reason?: string;
}

function mapTheForgeDocType(raw: string | undefined): DeskItemType {
  const lower = (raw ?? "").toLowerCase();
  if (lower.includes("adr") || lower.includes("architecture")) return "adr";
  if (lower.includes("spec") || lower.includes("blueprint") || lower.includes("mdd")) return "spec";
  if (lower.includes("task")) return "task";
  return "report";
}

/**
 * Placeholder sync: reads project id from product integrations.
 * When MCP tools are available in runtime, extend to call get_project / list deliverables.
 * For now creates a desk task prompting manual TheForge review if projectId is set.
 */
export async function syncTheForgeToDesk(input: {
  tenantId: string;
  productId: string;
  productName: string;
}): Promise<TheForgeDeskSyncResult> {
  const integrations = await getProductIntegrations(input.productId);
  const projectId = integrations.theforge?.projectId?.trim();
  if (!projectId) {
    return { created: 0, skipped: true, reason: "theforge_project_id_missing" };
  }

  await createDeskItem({
    tenantId: input.tenantId,
    productId: input.productId,
    type: mapTheForgeDocType("spec"),
    title: `TheForge project linked — review specs (${input.productName})`,
    previewText: `TheForge projectId: ${projectId}. Open TheForge or run forge-liaison agent to pull latest specs onto this desk.`,
    body: {
      content: `Linked TheForge project: ${projectId}`,
      theforgeProjectId: projectId,
      syncHint: "Use MCP TheForge tools to fetch MDD/specs; items will appear here as specs.",
    },
    sourceKind: "mcp",
    sourceMeta: { mcpServer: "user-theforge", theforgeProjectId: projectId },
    suggestedNextRole: "fullstack-dhh",
    status: "draft",
  });

  return { created: 1, skipped: false };
}
