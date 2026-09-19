import type { SharedMemory } from "../types/index.js";
import { persistHandoffAsAgentDoc } from "./agent-deliverables.js";
import { prisma } from "./prisma.js";
import { collectRunClosureStats } from "./product-run-closure.js";
import { resolveProductWorkspaceRoot } from "./product-workspace.js";
import { collectRunSummarySources } from "./run-summary.js";
import { resolveTenantWorkspaceRoot } from "./tenant-workspace.js";

function buildFallbackDeliverableMarkdown(
  sources: ReturnType<typeof collectRunSummarySources>,
  workflowName: string,
  runId: string,
): string {
  const sections = sources.map(
    (source) => `## ${source.agentName.replace(/-/g, " ")} (step ${source.stepOrder})\n\n${source.content}`,
  );

  return `# Consolidated deliverable — ${workflowName}

- Run: \`${runId}\`
- Auto-generated because no persisted files were detected for this encargo.

---

${sections.join("\n\n")}`;
}

export async function ensureRunDeliverables(input: {
  tenantId: string;
  runId: string;
  workflowName: string;
  memory: SharedMemory;
  productSlug?: string;
  tenantSlug?: string | null;
}): Promise<SharedMemory> {
  const stats = collectRunClosureStats(input.memory);
  if (stats.deliverablesSaved > 0 || stats.stepsWithOutput === 0) {
    return input.memory;
  }

  const sources = collectRunSummarySources(input.memory);
  if (sources.length === 0) return input.memory;

  const workspaceRoot = input.productSlug
    ? resolveProductWorkspaceRoot(input.productSlug)
    : resolveTenantWorkspaceRoot(input.tenantId, input.tenantSlug);

  const lastAgent = sources[sources.length - 1]!.agentName;
  const body = buildFallbackDeliverableMarkdown(sources, input.workflowName, input.runId);

  const savedPath = await persistHandoffAsAgentDoc({
    workspaceRoot,
    agentName: lastAgent,
    workflowName: input.workflowName,
    runId: input.runId,
    content: body,
    companyScoped: !input.productSlug,
  });

  if (!savedPath) return input.memory;

  const history = Array.isArray(input.memory._history) ? [...input.memory._history] : [];
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i]!;
    const output = typeof entry.output === "string" ? entry.output.trim() : "";
    if (output.length > 0) {
      history[i] = { ...entry, savedDeliverablePath: savedPath };
      break;
    }
  }

  const updated: SharedMemory = {
    ...input.memory,
    _history: history,
    _deliverableFallback: {
      path: savedPath,
      at: new Date().toISOString(),
    },
  };

  await prisma.executionRun.update({
    where: { id: input.runId },
    data: { sharedMemory: updated as object },
  });

  return updated;
}
