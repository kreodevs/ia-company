import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "./prisma.js";
import { ensureTenantWorkspace } from "./tenant-workspace.js";
import type { SharedMemory } from "../types/index.js";
import { sanitizeLoadedNextAction } from "./stuck-action.js";

export const CONSENSUS_FILE_NAME = "consensus.md";

export const DEFAULT_TENANT_CONSENSUS_CONTENT = (tenantName: string): string =>
  `# ${tenantName} — Company Memory\n\nShared memory for autonomous cycles. Product-level memory lives in each product's own consensus.md.\n`;

export function formatConsensusFileBody(content: string, nextAction: string | null): string {
  const trimmed = content.trim();
  if (!trimmed) return DEFAULT_TENANT_CONSENSUS_CONTENT("Tenant");
  if (!nextAction?.trim() || /## Next Action/i.test(trimmed)) {
    return `${trimmed}\n`;
  }
  return `${trimmed}\n\n## Next Action\n${nextAction.trim()}\n`;
}

export async function syncConsensusFileToWorkspace(
  workspaceRoot: string,
  content: string,
  nextAction: string | null,
): Promise<void> {
  await mkdir(workspaceRoot, { recursive: true });
  await writeFile(
    join(workspaceRoot, CONSENSUS_FILE_NAME),
    formatConsensusFileBody(content, nextAction),
    "utf-8",
  );
}

export async function syncTenantConsensusToWorkspace(
  tenantId: string,
  workspaceRoot?: string,
): Promise<string> {
  const [consensus, tenant] = await Promise.all([
    prisma.tenantConsensus.findUnique({ where: { tenantId } }),
    workspaceRoot ? Promise.resolve(null) : prisma.tenant.findUnique({ where: { id: tenantId } }),
  ]);

  const root = workspaceRoot ?? (await ensureTenantWorkspace(tenantId, tenant?.slug));
  await syncConsensusFileToWorkspace(
    root,
    consensus?.content ?? DEFAULT_TENANT_CONSENSUS_CONTENT(tenant?.name ?? "Tenant"),
    consensus?.nextAction ?? null,
  );
  return root;
}

export interface MergeConsensusInput {
  consensus: { content: string; nextAction: string | null } | null;
  override?: SharedMemory;
}

export function mergeConsensusIntoMemory(
  consensus: { content: string; nextAction: string | null } | null,
  override: SharedMemory = {},
): SharedMemory {
  const rawNext =
    (typeof override.nextAction === "string" ? override.nextAction : undefined) ??
    consensus?.nextAction ??
    "Execute autonomous cycle";
  const nextAction = sanitizeLoadedNextAction(rawNext);

  return {
    ...override,
    consensus: override.consensus ?? consensus?.content,
    nextAction,
    task: (typeof override.task === "string" ? override.task : undefined) ?? nextAction,
  };
}

export function buildCompanyConsensusContentAfterRun(
  existingContent: string,
  memory: SharedMemory,
): string {
  if (typeof memory.consensusUpdate === "string" && memory.consensusUpdate.trim()) {
    return memory.consensusUpdate.trim();
  }

  if (
    typeof memory.consensus === "string" &&
    memory.consensus.trim() &&
    memory.consensus !== existingContent
  ) {
    return memory.consensus.trim();
  }

  const agent = typeof memory.lastAgent === "string" ? memory.lastAgent : "workflow";
  const output = typeof memory.lastOutput === "string" ? memory.lastOutput : "";
  if (!output.trim()) return existingContent;

  const stamp = new Date().toISOString();
  return `${existingContent.trim()}\n\n## Cycle ${stamp}\n**${agent}**\n\n${output.trim()}\n`;
}

export async function loadConsensusInitialMemory(
  tenantId: string,
  override: SharedMemory = {},
): Promise<SharedMemory> {
  const consensus = await prisma.tenantConsensus.findUnique({ where: { tenantId } });
  return mergeConsensusIntoMemory(consensus, override);
}

export async function persistCompanyConsensusFromRun(
  tenantId: string,
  memory: SharedMemory,
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  const existing = await prisma.tenantConsensus.findUnique({ where: { tenantId } });
  const baseContent =
    existing?.content ?? DEFAULT_TENANT_CONSENSUS_CONTENT(tenant?.name ?? "Tenant");

  const content = buildCompanyConsensusContentAfterRun(baseContent, memory);
  const rawNext =
    typeof memory.nextAction === "string" && memory.nextAction.trim()
      ? memory.nextAction.trim()
      : existing?.nextAction;
  const nextAction = rawNext ? sanitizeLoadedNextAction(rawNext) : existing?.nextAction;

  await prisma.tenantConsensus.upsert({
    where: { tenantId },
    update: { content, nextAction },
    create: {
      tenantId,
      content,
      nextAction: nextAction ?? "Define the next cycle focus",
    },
  });

  await syncTenantConsensusToWorkspace(tenantId);
}
