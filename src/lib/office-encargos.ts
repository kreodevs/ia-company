import type { ExecutionRun, ExecutionStatus } from "@prisma/client";
import { extractHandoffFromAgentOutput } from "./product-consensus.js";
import { listProductAgentDocs, readProductFile } from "./product-code.js";
import { prisma } from "./prisma.js";
import type { SharedMemory } from "../types/index.js";

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

export interface OfficeEncargoDetail extends OfficeEncargoSummary {
  finalReport: string;
  finalReportKind: "summary" | "agent" | "none";
  documents: OfficeEncargoDocument[];
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
  productSlug: string | null,
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
  if (productSlug && run.completedAt) {
    const docs = await listProductAgentDocs(productSlug);
    const start = (run.startedAt ?? run.createdAt).getTime();
    const end = run.completedAt.getTime() + 5 * 60_000;
    for (const role of docs.roles) {
      for (const doc of role.docs) {
        const modified = new Date(doc.modifiedAt).getTime();
        if (modified >= start && modified <= end) fileCount += 1;
      }
    }
  }

  return Math.max(historyLen, revisionCount, fileCount);
}

async function mapRunToSummary(
  run: ExecutionRun & { workflow: { name: string } },
  products: Array<{ id: string; slug: string; name: string }>,
  productConsensusByProductId: Map<string, string>,
): Promise<OfficeEncargoSummary> {
  const memory = (run.sharedMemory ?? {}) as SharedMemory;
  const request = extractRequest(memory);
  const product = resolveProductFromMemory(memory, products);
  const teamAgents = extractTeamAgents(memory);
  const consensusId = product ? productConsensusByProductId.get(product.id) : undefined;
  const documentCount = await countDocumentsForRun(run, product?.slug ?? null, consensusId ?? null);

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

  const [runs, products, consensusRows] = await Promise.all([
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
  ]);

  const consensusByProductId = new Map(consensusRows.map((c) => [c.productId, c.id]));

  let items = await Promise.all(
    runs.map((run) => mapRunToSummary(run, products, consensusByProductId)),
  );

  if (options.phase) {
    items = items.filter((item) => item.phase === options.phase);
  }

  return { items };
}

async function loadRunDocuments(
  run: ExecutionRun & { workflow: { name: string } },
  product: { id: string; slug: string; name: string } | null,
  consensusId: string | null,
): Promise<OfficeEncargoDocument[]> {
  const memory = (run.sharedMemory ?? {}) as SharedMemory;
  const documents: OfficeEncargoDocument[] = [];
  const seen = new Set<string>();
  const revisionKeys = new Set<string>();

  const push = (doc: OfficeEncargoDocument) => {
    const agentStepKey = `${doc.agentName}:${doc.stepOrder}`;
    const contentKey = `${agentStepKey}:${doc.markdown.trim().slice(0, 200)}`;
    if (seen.has(contentKey)) return;
    seen.add(contentKey);
    documents.push(doc);
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
    if (!raw.trim()) continue;
    const stepOrder = step.stepOrder ?? i + 1;
    if (revisionKeys.has(`${step.agentName}:${stepOrder}`)) continue;

    const handoff = extractHandoffFromAgentOutput(raw, step.agentName, stepOrder);
    if (!handoff.content.trim()) continue;
    push({
      id: `step-${step.stepId ?? i}`,
      kind: "step",
      agentName: step.agentName,
      title: step.agentName.replace(/-/g, " "),
      markdown: handoff.content.trim(),
      stepOrder,
    });
  }

  if (product?.slug && run.completedAt && revisionKeys.size === 0) {
    const docsIndex = await listProductAgentDocs(product.slug);
    const start = (run.startedAt ?? run.createdAt).getTime();
    const end = run.completedAt.getTime() + 5 * 60_000;

    for (const role of docsIndex.roles) {
      for (const doc of role.docs) {
        const modified = new Date(doc.modifiedAt).getTime();
        if (modified < start || modified > end) continue;
        if (!DOC_EXTENSIONS.has(doc.name.slice(doc.name.lastIndexOf(".")).toLowerCase())) continue;

        try {
          const file = await readProductFile(product.slug, doc.path);
          if (!file.content.trim()) continue;
          push({
            id: `file-${doc.path}`,
            kind: "file",
            agentName: role.role,
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

  const products = await prisma.tenantProduct.findMany({
    where: { tenantId },
    select: { id: true, slug: true, name: true },
  });
  const consensusRows = await prisma.productConsensus.findMany({
    where: { product: { tenantId } },
    select: { id: true, productId: true },
  });
  const consensusByProductId = new Map(consensusRows.map((c) => [c.productId, c.id]));

  const memory = (run.sharedMemory ?? {}) as SharedMemory;
  const product = resolveProductFromMemory(memory, products);
  const consensusId = product ? (consensusByProductId.get(product.id) ?? null) : null;

  const summary = await mapRunToSummary(run, products, consensusByProductId);
  const documents = await loadRunDocuments(run, product, consensusId);

  const revisions = documents
    .filter((d) => d.kind === "revision")
    .map((d) => ({ agentName: d.agentName, content: d.markdown, stepOrder: d.stepOrder }));

  const finalReport = resolveFinalReport(memory, documents, revisions);
  const finalReportKind: OfficeEncargoDetail["finalReportKind"] = readMemoryString(memory, "runSummary")
    ? "summary"
    : finalReport
      ? "agent"
      : "none";

  return {
    ...summary,
    documentCount: documents.length,
    hasFinalReport: finalReport.length > 0,
    finalReport,
    finalReportKind,
    documents,
    debugHref: `/debug/runs/${run.id}`,
    warRoomHref: product ? `/war-room/${product.id}` : null,
  };
}

export function encargoHumanHref(runId: string): string {
  return `/office/encargos/${runId}`;
}
