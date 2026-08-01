import { prisma } from "./prisma.js";
import { listArtifacts } from "./artifact.js";
import { listProductAgentDocs } from "./product-code.js";
import { resolveVirtualDepartmentForAgent, VIRTUAL_OFFICE_DEPARTMENTS } from "./office-departments.js";
import {
  loadRunDocuments,
  resolveFinalReport,
  type OfficeEncargoDocument,
} from "./office-encargos.js";
import { resolveProductWorkspaceRoot } from "./product-workspace.js";
import { resolveTenantWorkspaceRoot } from "./tenant-workspace.js";
import { isCompanyScopedMemory } from "./scope-contract.js";
import type { SharedMemory } from "../types/index.js";

export type OfficeArchiveSource = "encargo" | "encargo_summary" | "workspace" | "artifact";

export interface OfficeArchiveItem {
  id: string;
  source: OfficeArchiveSource;
  title: string;
  agentName: string | null;
  departmentSlug: string | null;
  orgUnitId: string | null;
  orgUnitName: string | null;
  productId: string | null;
  productName: string | null;
  productSlug: string | null;
  runId: string | null;
  encargoTitle: string | null;
  path: string | null;
  preview: string;
  markdown: string;
  timestamp: string;
  encargoHref: string | null;
}

export interface OfficeArchiveFiltersMeta {
  departments: Array<{ slug: string; labelKey: string }>;
  products: Array<{ id: string; name: string; slug: string }>;
  orgUnits: Array<{ id: string; name: string }>;
  agents: string[];
}

export interface ListOfficeArchiveOptions {
  departmentSlug?: string;
  orgUnitId?: string;
  productId?: string;
  agentName?: string;
  source?: OfficeArchiveSource;
  q?: string;
  limit?: number;
}

const MAX_RUNS_FOR_DOCS = 20;
const DEFAULT_LIMIT = 120;

const ROLE_FOLDER_TO_AGENT: Record<string, string> = {
  research: "research-thompson",
  ceo: "ceo-bezos",
  critic: "critic-munger",
  product: "product-norman",
  interaction: "interaction-cooper",
  ui: "ui-duarte",
  cto: "cto-vogels",
  fullstack: "fullstack-dhh",
  qa: "qa-bach",
  devops: "devops-hightower",
  cfo: "cfo-campbell",
  sales: "sales-ross",
  operations: "operations-pg",
  marketing: "marketing-godin",
};

function previewText(text: string, max = 280): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length <= max ? normalized : `${normalized.slice(0, max)}…`;
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
  return [...new Set(history.map((h) => h.agentName).filter(Boolean))];
}

function resolveProductFromMemory(
  memory: SharedMemory,
  products: Array<{ id: string; slug: string; name: string; orgUnitId: string | null }>,
): { id: string; slug: string; name: string; orgUnitId: string | null } | null {
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

function memoryOrgUnitId(memory: SharedMemory): string | null {
  return readMemoryString(memory, "orgUnitId");
}

function agentForDocRole(role: string): string | null {
  return ROLE_FOLDER_TO_AGENT[role] ?? null;
}

function encargoDocToArchiveItem(
  doc: OfficeEncargoDocument,
  ctx: {
    runId: string;
    encargoTitle: string;
    timestamp: string;
    product: { id: string; name: string; slug: string; orgUnitId: string | null } | null;
    orgUnitName: string | null;
    orgUnitId: string | null;
  },
): OfficeArchiveItem {
  return {
    id: `encargo-${ctx.runId}-${doc.id}`,
    source: "encargo",
    title: doc.title,
    agentName: doc.agentName,
    departmentSlug: resolveVirtualDepartmentForAgent(doc.agentName),
    orgUnitId: ctx.orgUnitId,
    orgUnitName: ctx.orgUnitName,
    productId: ctx.product?.id ?? null,
    productName: ctx.product?.name ?? null,
    productSlug: ctx.product?.slug ?? null,
    runId: ctx.runId,
    encargoTitle: ctx.encargoTitle,
    path: doc.path ?? null,
    preview: previewText(doc.markdown),
    markdown: doc.markdown,
    timestamp: ctx.timestamp,
    encargoHref: `/office/encargos/${ctx.runId}`,
  };
}

function matchesFilters(item: OfficeArchiveItem, options: ListOfficeArchiveOptions): boolean {
  if (options.departmentSlug && item.departmentSlug !== options.departmentSlug) return false;
  if (options.orgUnitId && item.orgUnitId !== options.orgUnitId) return false;
  if (options.productId && item.productId !== options.productId) return false;
  if (options.agentName && item.agentName !== options.agentName) return false;
  if (options.source && item.source !== options.source) return false;
  if (options.q) {
    const q = options.q.toLowerCase();
    const haystack = [
      item.title,
      item.encargoTitle,
      item.agentName,
      item.productName,
      item.orgUnitName,
      item.preview,
      item.path,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export async function listOfficeArchive(
  tenantId: string,
  options: ListOfficeArchiveOptions = {},
): Promise<{ items: OfficeArchiveItem[]; filters: OfficeArchiveFiltersMeta; total: number }> {
  const limit = Math.min(200, Math.max(1, options.limit ?? DEFAULT_LIMIT));

  const [products, orgUnits, consensusRows, tenant, runs, artifacts] = await Promise.all([
    prisma.tenantProduct.findMany({
      where: { tenantId, phase: { not: "archived" } },
      select: { id: true, slug: true, name: true, orgUnitId: true },
      orderBy: { name: "asc" },
    }),
    prisma.orgUnit.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.productConsensus.findMany({
      where: { tenantId },
      select: { id: true, productId: true },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } }),
    prisma.executionRun.findMany({
      where: { tenantId, status: { in: ["COMPLETED", "RUNNING", "DELEGATED", "AWAITING_USER"] } },
      orderBy: { createdAt: "desc" },
      take: MAX_RUNS_FOR_DOCS,
      include: { workflow: { select: { name: true } } },
    }),
    listArtifacts(tenantId, { limit: 60 }),
  ]);

  const orgUnitNameById = new Map(orgUnits.map((o) => [o.id, o.name]));
  const consensusByProductId = new Map(consensusRows.map((c) => [c.productId, c.id]));
  const items: OfficeArchiveItem[] = [];
  const seenWorkspace = new Set<string>();

  for (const run of runs) {
    const memory = (run.sharedMemory ?? {}) as SharedMemory;
    const request = extractRequest(memory);
    const encargoTitle =
      request.length >= 8 ? request.slice(0, 120) : (run.workflow?.name ?? "Encargo");
    const product = isCompanyScopedMemory(memory as Record<string, unknown>)
      ? null
      : resolveProductFromMemory(memory, products);
    const orgUnitId = memoryOrgUnitId(memory) ?? product?.orgUnitId ?? null;
    const orgUnitName = orgUnitId ? (orgUnitNameById.get(orgUnitId) ?? null) : null;
    const teamAgents = extractTeamAgents(memory);
    const workspaceRoot = product?.slug
      ? resolveProductWorkspaceRoot(product.slug)
      : resolveTenantWorkspaceRoot(tenantId, tenant?.slug);
    const consensusId = product ? (consensusByProductId.get(product.id) ?? null) : null;
    const timestamp = (run.completedAt ?? run.startedAt ?? run.createdAt).toISOString();

    const documents = await loadRunDocuments(run, workspaceRoot, consensusId, teamAgents);
    const revisions = documents
      .filter((d) => d.kind === "revision")
      .map((d) => ({ agentName: d.agentName, content: d.markdown, stepOrder: d.stepOrder }));

    const finalReport = resolveFinalReport(memory, documents, revisions);
    if (finalReport.trim()) {
      items.push({
        id: `summary-${run.id}`,
        source: "encargo_summary",
        title: encargoTitle,
        agentName: null,
        departmentSlug: null,
        orgUnitId,
        orgUnitName,
        productId: product?.id ?? null,
        productName: product?.name ?? null,
        productSlug: product?.slug ?? null,
        runId: run.id,
        encargoTitle,
        path: null,
        preview: previewText(finalReport),
        markdown: finalReport,
        timestamp,
        encargoHref: `/office/encargos/${run.id}`,
      });
    }

    for (const doc of documents) {
      if (doc.path && product?.slug) {
        seenWorkspace.add(`${product.slug}:${doc.path}`);
      }
      items.push(
        encargoDocToArchiveItem(doc, {
          runId: run.id,
          encargoTitle,
          timestamp,
          product,
          orgUnitName,
          orgUnitId,
        }),
      );
    }
  }

  for (const product of products) {
    const docsIndex = await listProductAgentDocs(product.slug);
    const orgUnitName = product.orgUnitId
      ? (orgUnitNameById.get(product.orgUnitId) ?? null)
      : null;

    for (const role of docsIndex.roles) {
      for (const doc of role.docs) {
        const workspaceKey = `${product.slug}:${doc.path}`;
        if (seenWorkspace.has(workspaceKey)) continue;

        const matchedAgent = agentForDocRole(role.role);
        items.push({
          id: `workspace-${workspaceKey}`,
          source: "workspace",
          title: doc.name,
          agentName: matchedAgent,
          departmentSlug: resolveVirtualDepartmentForAgent(matchedAgent),
          orgUnitId: product.orgUnitId,
          orgUnitName,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          runId: null,
          encargoTitle: null,
          path: doc.path,
          preview: doc.path,
          markdown: "",
          timestamp: doc.modifiedAt,
          encargoHref: null,
        });
      }
    }
  }

  for (const art of artifacts) {
    const preview =
      art.previewText?.trim() ||
      (typeof art.body === "object" && art.body && "text" in art.body
        ? String((art.body as { text?: unknown }).text ?? "")
        : JSON.stringify(art.body ?? {}, null, 2));

    items.push({
      id: `artifact-${art.id}`,
      source: "artifact",
      title: art.title,
      agentName: art.createdByAgent,
      departmentSlug: resolveVirtualDepartmentForAgent(art.createdByAgent),
      orgUnitId: art.orgUnitId,
      orgUnitName: orgUnitNameById.get(art.orgUnitId) ?? null,
      productId: art.productId,
      productName: art.productId
        ? (products.find((p) => p.id === art.productId)?.name ?? null)
        : null,
      productSlug: art.productId
        ? (products.find((p) => p.id === art.productId)?.slug ?? null)
        : null,
      runId: art.runId,
      encargoTitle: null,
      path: null,
      preview: previewText(preview),
      markdown: preview,
      timestamp: art.createdAt,
      encargoHref: art.runId ? `/office/encargos/${art.runId}` : null,
    });
  }

  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const filtered = items.filter((item) => matchesFilters(item, options));
  const agentSet = new Set<string>();
  for (const item of items) {
    if (item.agentName) agentSet.add(item.agentName);
  }

  return {
    items: filtered.slice(0, limit),
    total: filtered.length,
    filters: {
      departments: VIRTUAL_OFFICE_DEPARTMENTS.map((d) => ({
        slug: d.slug,
        labelKey: d.labelKey,
      })),
      products: products.map((p) => ({ id: p.id, name: p.name, slug: p.slug })),
      orgUnits: orgUnits.map((o) => ({ id: o.id, name: o.name })),
      agents: [...agentSet].sort(),
    },
  };
}
