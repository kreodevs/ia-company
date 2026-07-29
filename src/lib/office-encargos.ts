import type { DecisionStatus, ExecutionRun, ExecutionStatus, GoNoGoDecision } from "@prisma/client";
import { extractHandoffFromAgentOutput } from "./product-consensus.js";
import {
  listWorkspaceAgentDocs,
  readWorkspaceFile,
} from "./product-code.js";
import { resolveProductWorkspaceRoot } from "./product-workspace.js";
import { prisma } from "./prisma.js";
import { resolveTenantWorkspaceRoot } from "./tenant-workspace.js";
import type { SharedMemory } from "../types/index.js";
import type { ProposalEvidence } from "./decision-proposals.js";

export type OfficeEncargoPhase = "queued" | "in_progress" | "delivered" | "failed" | "cancelled";

export interface OfficeEncargoSummary {
  id: string;
  title: string;
  request: string;
  workflowName: string;
  status: ExecutionStatus;
  phase: OfficeEncargoPhase;
  productId: string | null;
  productName: string | null;
  productSlug: string | null;
  teamAgents: string[];
  totalCostUsd: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  documentCount: number;
  hasFinalReport: boolean;
}

export interface OfficeEncargoDocument {
  id: string;
  kind: "revision" | "step" | "file";
  agentName: string;
  title: string;
  markdown: string;
  path?: string;
  stepOrder: number;
}

export interface OfficeEncargoDecisionProposal {
  id: string;
  status: DecisionStatus;
  recommended: GoNoGoDecision;
  rationale: string;
  ideaTitle: string;
  pivotPrompt: string | null;
  evidence: ProposalEvidence[];
}

export interface OfficeEncargoDetail extends OfficeEncargoSummary {
  finalReport: string;
  finalReportKind: "summary" | "agent" | "none";
  documents: OfficeEncargoDocument[];
  nextAction: string | null;
  decisionProposal: OfficeEncargoDecisionProposal | null;
  debugHref: string;
  warRoomHref: string | null;
}

const FINAL_REPORT_AGENTS = ["ceo-bezos", "coordinator-chief", "critic-munger", "research-thompson"];

function toPhase(status: ExecutionStatus): OfficeEncargoPhase {
  if (status === "COMPLETED") return "delivered";
  if (status === "FAILED") return "failed";
  if (status === "CANCELLED") return "cancelled";
  if (status === "PENDING") return "queued";
  return "in_progress";
}

function readMemoryString(memory: SharedMemory, key: string): string | null {
  const value = memory[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractNextAction(memory: SharedMemory): string | null {
  const fromMemory = readMemoryString(memory, "nextAction");
  if (fromMemory) return fromMemory;
  const closure = memory._runClosure as { nextAction?: string } | undefined;
  if (typeof closure?.nextAction === "string" && closure.nextAction.trim()) {
    return closure.nextAction.trim();
  }
  return null;
}

function resolveRunWorkspaceRoot(
  tenantId: string,
  tenantSlug: string | null | undefined,
  productSlug: string | null,
): string {
  if (productSlug) return resolveProductWorkspaceRoot(productSlug);
  return resolveTenantWorkspaceRoot(tenantId, tenantSlug);
}

function agentNameForDocRole(role: string, teamAgents: string[]): string {
  const exact = teamAgents.find((a) => a === role);
  if (exact) return exact;
  const prefixed = teamAgents.find((a) => a.startsWith(`${role}-`));
  if (prefixed) return prefixed;
  return role;
}

export function resolveStepMarkdown(raw: string, agentName: string, stepOrder: number): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const handoff = extractHandoffFromAgentOutput(raw, agentName, stepOrder);
  const handoffText = handoff.content.trim();
  if (handoffText.length < 400 && trimmed.length > handoffText.length + 80) {
    return trimmed;
  }
  return handoffText || trimmed;
}

function extractRequest(memory: SharedMemory): string {
  return (
    readMemoryString(memory, "officeRequest") ??
    readMemoryString(memory, "task") ??
    readMemoryString(memory, "nextAction") ??
    ""
  );
}

function extractTeamAgents(memory: SharedMemory): string[] {
  if (Array.isArray(memory.teamAgents)) {
    return memory.teamAgents.filter((a): a is string => typeof a === "string");
  }
  const history = Array.isArray(memory._history) ? memory._history : [];
  const names = history.map((h) => h.agentName).filter(Boolean);
  return [...new Set(names)];
}

function resolveProductFromMemory(
  memory: SharedMemory,
  products: Array<{ id: string; slug: string; name: string }>,
): { id: string; slug: string; name: string } | null {
  const productId = readMemoryString(memory, "productId");
  if (productId) {
    const match = products.find((p) => p.id === productId);
    if (match) return match;
  }
  const slug = readMemoryString(memory, "focusProductSlug");
  if (slug) {
    const match = products.find((p) => p.slug === slug);
    if (match) return match;
  }
  return null;
}

function buildTitle(request: string, workflowName: string): string {
  if (request.length >= 8) return request.slice(0, 120);
  return workflowName;
}

function pickFinalReport(
  documents: OfficeEncargoDocument[],
  revisions: Array<{ agentName: string; content: string; stepOrder: number }>,
): string {
  for (const agent of FINAL_REPORT_AGENTS) {
    const rev = revisions.find((r) => r.agentName === agent && r.content.trim());
    if (rev) return rev.content.trim();
    const doc = documents.find((d) => d.agentName === agent && d.markdown.trim());
    if (doc) return doc.markdown.trim();
  }

  const sorted = [...revisions].sort((a, b) => b.stepOrder - a.stepOrder);
  if (sorted[0]?.content.trim()) return sorted[0].content.trim();

  const lastDoc = [...documents].sort((a, b) => b.stepOrder - a.stepOrder)[0];
  if (lastDoc?.markdown.trim()) return lastDoc.markdown.trim();

  return "";
}

export function resolveFinalReport(
  memory: SharedMemory,
  documents: OfficeEncargoDocument[],
  revisions: Array<{ agentName: string; content: string; stepOrder: number }>,
): string {
  const runSummary = readMemoryString(memory, "runSummary");
  if (runSummary) return runSummary;
  return pickFinalReport(documents, revisions);
}

async function countDocumentsForRun(
  run: ExecutionRun & { workflow: { name: string } },
  workspaceRoot: string | null,
  productConsensusId: string | null,
): Promise<number> {
  const memory = (run.sharedMemory ?? {}) as SharedMemory;
  const historyLen = Array.isArray(memory._history) ? memory._history.length : 0;

  let revisionCount = 0;
  if (productConsensusId) {
    revisionCount = await prisma.productConsensusRevision.count({
      where: { productId: productConsensusId, runId: run.id },
    });
  }

  let fileCount = 0;
  if (workspaceRoot && run.completedAt) {
    const docs = await listWorkspaceAgentDocs(workspaceRoot);
    const start = (run.startedAt ?? run.createdAt).getTime();
    const end = run.completedAt.getTime() + 5 * 60_000;
    for (const role of docs.roles) {
      for (const doc of role.docs) {
        const modified = new Date(doc.modifiedAt).getTime();
        if (modified >= start && modified <= end) fileCount += 1;
      }
    }
  }

  const savedPaths = (Array.isArray(memory._history) ? memory._history : []).filter(
    (h) => typeof h.savedDeliverablePath === "string" && h.savedDeliverablePath.trim(),
  ).length;

  return Math.max(historyLen, revisionCount, fileCount, savedPaths);
}

async function mapRunToSummary(
  run: ExecutionRun & { workflow: { name: string } },
  products: Array<{ id: string; slug: string; name: string }>,
  productConsensusByProductId: Map<string, string>,
  tenantId: string,
  tenantSlug: string | null | undefined,
): Promise<OfficeEncargoSummary> {
  const memory = (run.sharedMemory ?? {}) as SharedMemory;
  const request = extractRequest(memory);
  const product = resolveProductFromMemory(memory, products);
  const teamAgents = extractTeamAgents(memory);
  const consensusId = product ? productConsensusByProductId.get(product.id) : undefined;
  const workspaceRoot = resolveRunWorkspaceRoot(tenantId, tenantSlug, product?.slug ?? null);
  const documentCount = await countDocumentsForRun(run, workspaceRoot, consensusId ?? null);

  const phase = toPhase(run.status);
  const hasRunSummary = Boolean(readMemoryString(memory, "runSummary"));
  const hasFinalReport = phase === "delivered" && (hasRunSummary || documentCount > 0);

  return {
    id: run.id,
    title: buildTitle(request, run.workflow.name),
    request,
    workflowName: run.workflow.name,
    status: run.status,
    phase,
    productId: product?.id ?? null,
    productName: product?.name ?? null,
    productSlug: product?.slug ?? null,
    teamAgents,
    totalCostUsd: run.totalCostUsd,
    startedAt: run.startedAt?.toISOString() ?? null,
    completedAt: run.completedAt?.toISOString() ?? null,
    createdAt: run.createdAt.toISOString(),
    documentCount,
    hasFinalReport,
  };
}

export async function listOfficeEncargos(
  tenantId: string,
  options: { limit?: number; phase?: OfficeEncargoPhase } = {},
): Promise<{ items: OfficeEncargoSummary[] }> {
  const limit = Math.min(100, Math.max(1, options.limit ?? 50));

  const [runs, products, consensusRows, tenant] = await Promise.all([
    prisma.executionRun.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { workflow: { select: { name: true } } },
    }),
    prisma.tenantProduct.findMany({
      where: { tenantId },
      select: { id: true, slug: true, name: true },
    }),
    prisma.productConsensus.findMany({
      where: { tenantId },
      select: { id: true, productId: true },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } }),
  ]);

  const consensusByProductId = new Map(consensusRows.map((c) => [c.productId, c.id]));

  let items = await Promise.all(
    runs.map((run) =>
      mapRunToSummary(run, products, consensusByProductId, tenantId, tenant?.slug),
    ),
  );

  if (options.phase) {
    items = items.filter((item) => item.phase === options.phase);
  }

  return { items };
}

export async function loadRunDocuments(
  run: ExecutionRun & { workflow: { name: string } },
  workspaceRoot: string,
  consensusId: string | null,
  teamAgents: string[],
): Promise<OfficeEncargoDocument[]> {
  const memory = (run.sharedMemory ?? {}) as SharedMemory;
  const documents: OfficeEncargoDocument[] = [];
  const seen = new Set<string>();
  const revisionKeys = new Set<string>();
  const loadedPaths = new Set<string>();
  const agentsWithFile = new Set<string>();

  const push = (doc: OfficeEncargoDocument) => {
    const agentStepKey = `${doc.agentName}:${doc.stepOrder}`;
    const contentKey = `${agentStepKey}:${doc.markdown.trim().slice(0, 200)}`;
    if (seen.has(contentKey)) return;
    seen.add(contentKey);
    documents.push(doc);
    if (doc.kind === "file") {
      agentsWithFile.add(doc.agentName);
      if (doc.path) loadedPaths.add(doc.path);
    }
  };

  if (consensusId) {
    const revisions = await prisma.productConsensusRevision.findMany({
      where: { productId: consensusId, runId: run.id },
      orderBy: { stepOrder: "asc" },
    });
    for (const rev of revisions) {
      if (!rev.content.trim()) continue;
      revisionKeys.add(`${rev.agentName}:${rev.stepOrder}`);
      push({
        id: rev.id,
        kind: "revision",
        agentName: rev.agentName,
        title: rev.agentName.replace(/-/g, " "),
        markdown: rev.content.trim(),
        stepOrder: rev.stepOrder,
      });
    }
  }

  const history = Array.isArray(memory._history) ? memory._history : [];
  for (let i = 0; i < history.length; i++) {
    const step = history[i]!;
    const raw = typeof step.output === "string" ? step.output : "";
    const stepOrder = step.stepOrder ?? i + 1;
    if (revisionKeys.has(`${step.agentName}:${stepOrder}`)) continue;

    const savedPath =
      typeof step.savedDeliverablePath === "string" ? step.savedDeliverablePath.trim() : "";
    if (savedPath) {
      try {
        const file = await readWorkspaceFile(workspaceRoot, savedPath);
        if (file.content.trim()) {
          push({
            id: `file-${savedPath}`,
            kind: "file",
            agentName: step.agentName,
            title: savedPath.split("/").pop() ?? savedPath,
            markdown: file.content,
            path: savedPath,
            stepOrder,
          });
          continue;
        }
      } catch {
        // fall through to step output
      }
    }

    if (!raw.trim()) continue;
    if (agentsWithFile.has(step.agentName)) continue;

    const markdown = resolveStepMarkdown(raw, step.agentName, stepOrder);
    if (!markdown) continue;
    push({
      id: `step-${step.stepId ?? i}`,
      kind: "step",
      agentName: step.agentName,
      title: step.agentName.replace(/-/g, " "),
      markdown,
      stepOrder,
    });
  }

  if (run.completedAt) {
    const docsIndex = await listWorkspaceAgentDocs(workspaceRoot);
    const start = (run.startedAt ?? run.createdAt).getTime();
    const end = run.completedAt.getTime() + 5 * 60_000;

    for (const role of docsIndex.roles) {
      for (const doc of role.docs) {
        const modified = new Date(doc.modifiedAt).getTime();
        if (modified < start || modified > end) continue;
        if (!DOC_EXTENSIONS.has(doc.name.slice(doc.name.lastIndexOf(".")).toLowerCase())) continue;
        if (loadedPaths.has(doc.path)) continue;

        try {
          const file = await readWorkspaceFile(workspaceRoot, doc.path);
          if (!file.content.trim()) continue;
          const agentName = agentNameForDocRole(role.role, teamAgents);
          push({
            id: `file-${doc.path}`,
            kind: "file",
            agentName,
            title: doc.name,
            markdown: file.content,
            path: doc.path,
            stepOrder: 900 + documents.length,
          });
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  return documents.sort((a, b) => a.stepOrder - b.stepOrder);
}

const DOC_EXTENSIONS = new Set([".md", ".markdown", ".mdx"]);

export async function getOfficeEncargoDetail(
  tenantId: string,
  runId: string,
): Promise<OfficeEncargoDetail | null> {
  const run = await prisma.executionRun.findFirst({
    where: { id: runId, tenantId },
    include: { workflow: { select: { name: true } } },
  });
  if (!run) return null;

  const [products, consensusRows, tenant, proposalRow] = await Promise.all([
    prisma.tenantProduct.findMany({
      where: { tenantId },
      select: { id: true, slug: true, name: true },
    }),
    prisma.productConsensus.findMany({
      where: { product: { tenantId } },
      select: { id: true, productId: true },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } }),
    prisma.decisionProposal.findFirst({
      where: { tenantId, runId: run.id },
      orderBy: { createdAt: "desc" },
      include: { idea: true },
    }),
  ]);
  const consensusByProductId = new Map(consensusRows.map((c) => [c.productId, c.id]));

  const memory = (run.sharedMemory ?? {}) as SharedMemory;
  const product = resolveProductFromMemory(memory, products);
  const consensusId = product ? (consensusByProductId.get(product.id) ?? null) : null;
  const teamAgents = extractTeamAgents(memory);
  const workspaceRoot = resolveRunWorkspaceRoot(tenantId, tenant?.slug, product?.slug ?? null);

  const summary = await mapRunToSummary(
    run,
    products,
    consensusByProductId,
    tenantId,
    tenant?.slug,
  );
  const documents = await loadRunDocuments(run, workspaceRoot, consensusId, teamAgents);

  const revisions = documents
    .filter((d) => d.kind === "revision")
    .map((d) => ({ agentName: d.agentName, content: d.markdown, stepOrder: d.stepOrder }));

  const finalReport = resolveFinalReport(memory, documents, revisions);
  const finalReportKind: OfficeEncargoDetail["finalReportKind"] = readMemoryString(memory, "runSummary")
    ? "summary"
    : finalReport
      ? "agent"
      : "none";

  const decisionProposal: OfficeEncargoDecisionProposal | null = proposalRow
    ? {
        id: proposalRow.id,
        status: proposalRow.status,
        recommended: proposalRow.recommended,
        rationale: proposalRow.rationale,
        ideaTitle: proposalRow.idea.title,
        pivotPrompt: proposalRow.pivotPrompt,
        evidence: (proposalRow.evidence as ProposalEvidence[] | null) ?? [],
      }
    : null;

  return {
    ...summary,
    documentCount: documents.length,
    hasFinalReport: finalReport.length > 0,
    finalReport,
    finalReportKind,
    documents,
    nextAction: extractNextAction(memory),
    decisionProposal,
    debugHref: `/debug/runs/${run.id}`,
    warRoomHref: product ? `/war-room/${product.id}` : null,
  };
}

export function encargoHumanHref(runId: string): string {
  return `/office/encargos/${runId}`;
}
