import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProductPhase } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { ensureProductWorkspace } from "./product-workspace.js";
import { collectJsonObjects } from "./structured-memory.js";
import type { SharedMemory } from "../types/index.js";

export const PRODUCT_PROFILE_FILE = "product-profile.json";

const MAX_PROFILE_HISTORY = 24;

export interface ProductProfileVersion {
  id: string;
  runId: string | null;
  createdAt: string;
  profile: ProductProfile;
  markdown: string;
}

export interface ProductIntakeDocument {
  productName: string;
  intakeStatus: import("@prisma/client").ProductIntakeStatus | null;
  intakeRunId: string | null;
  versions: ProductProfileVersion[];
}

export interface ProductProfile {
  summary: string;
  valueProposition: string;
  targetAudience: string;
  problemStatement: string;
  businessModel: string;
  competitors: string[];
  techStack: string[];
  monetizationHypothesis: string;
  suggestedPhase?: ProductPhase;
  nextAction: string;
  githubRepoUrl?: string | null;
  githubFullName?: string | null;
  sources?: string[];
  updatedAt?: string;
}

export function emptyProductProfile(): ProductProfile {
  return {
    summary: "",
    valueProposition: "",
    targetAudience: "",
    problemStatement: "",
    businessModel: "",
    competitors: [],
    techStack: [],
    monetizationHypothesis: "",
    nextAction: "",
  };
}

export function parseProductProfile(value: unknown): ProductProfile | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const str = (k: string) => (typeof o[k] === "string" ? o[k].trim() : "");
  const arr = (k: string) =>
    Array.isArray(o[k])
      ? (o[k] as unknown[]).filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];

  const summary = str("summary");
  if (!summary) return null;

  return {
    summary,
    valueProposition: str("valueProposition"),
    targetAudience: str("targetAudience"),
    problemStatement: str("problemStatement"),
    businessModel: str("businessModel"),
    competitors: arr("competitors"),
    techStack: arr("techStack"),
    monetizationHypothesis: str("monetizationHypothesis"),
    suggestedPhase: typeof o.suggestedPhase === "string" ? (o.suggestedPhase as ProductPhase) : undefined,
    nextAction: str("nextAction"),
    githubRepoUrl: typeof o.githubRepoUrl === "string" ? o.githubRepoUrl : null,
    githubFullName: typeof o.githubFullName === "string" ? o.githubFullName : null,
    sources: arr("sources"),
    updatedAt: new Date().toISOString(),
  };
}

export function extractProductProfileFromMemory(memory: SharedMemory): ProductProfile | null {
  if (memory.productProfile && typeof memory.productProfile === "object") {
    const parsed = parseProductProfile(memory.productProfile);
    if (parsed) return parsed;
  }

  const history = Array.isArray(memory._history) ? memory._history : [];
  for (let i = history.length - 1; i >= 0; i--) {
    const output = history[i]?.output;
    if (typeof output !== "string") continue;
    for (const obj of collectJsonObjects(output)) {
      const profile = parseProductProfile(obj.productProfile ?? obj);
      if (profile) return profile;
    }
  }

  return null;
}

export function buildProductProfilePromptSection(profile: ProductProfile | null): string {
  if (!profile || !profile.summary.trim()) return "";

  const lines = [
    "## Product profile (authoritative context)",
    `- Summary: ${profile.summary}`,
  ];
  if (profile.valueProposition) lines.push(`- Value proposition: ${profile.valueProposition}`);
  if (profile.problemStatement) lines.push(`- Problem: ${profile.problemStatement}`);
  if (profile.targetAudience) lines.push(`- Target audience: ${profile.targetAudience}`);
  if (profile.businessModel) lines.push(`- Business model: ${profile.businessModel}`);
  if (profile.monetizationHypothesis) lines.push(`- Monetization: ${profile.monetizationHypothesis}`);
  if (profile.competitors.length) lines.push(`- Competitors: ${profile.competitors.join("; ")}`);
  if (profile.techStack.length) lines.push(`- Tech stack: ${profile.techStack.join(", ")}`);
  if (profile.githubFullName) lines.push(`- GitHub: ${profile.githubFullName}`);
  if (profile.nextAction) lines.push(`- Next action: ${profile.nextAction}`);
  return lines.join("\n");
}

export function productProfileToMarkdown(productName: string, profile: ProductProfile): string {
  const lines = [
    `# ${productName} — Product intake`,
    "",
    profile.summary,
    "",
    "## Value proposition",
    profile.valueProposition || "—",
    "",
    "## Problem",
    profile.problemStatement || "—",
    "",
    "## Target audience",
    profile.targetAudience || "—",
    "",
    "## Business model",
    profile.businessModel || "—",
    "",
    "## Monetization",
    profile.monetizationHypothesis || "—",
  ];
  if (profile.competitors.length) {
    lines.push("", "## Competitors", ...profile.competitors.map((c) => `- ${c}`));
  }
  if (profile.techStack.length) {
    lines.push("", "## Tech stack", ...profile.techStack.map((t) => `- ${t}`));
  }
  if (profile.githubFullName) {
    lines.push("", "## GitHub", profile.githubFullName);
  }
  if (profile.sources?.length) {
    lines.push("", "## Sources", ...profile.sources.map((s) => `- ${s}`));
  }
  lines.push("", "## Next action", profile.nextAction || "—");
  return lines.join("\n");
}

function parseProfileVersion(value: unknown, productName: string): ProductProfileVersion | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const profile = parseProductProfile(o.profile);
  if (!profile) return null;
  const id = typeof o.id === "string" && o.id.trim() ? o.id : null;
  if (!id) return null;
  const createdAt =
    typeof o.createdAt === "string" && o.createdAt.trim()
      ? o.createdAt
      : profile.updatedAt ?? new Date().toISOString();
  const markdown =
    typeof o.markdown === "string" && o.markdown.trim()
      ? o.markdown
      : productProfileToMarkdown(productName, profile);
  return {
    id,
    runId: typeof o.runId === "string" ? o.runId : null,
    createdAt,
    profile,
    markdown,
  };
}

function readProfileHistory(metadata: unknown, productName: string): ProductProfileVersion[] {
  if (!metadata || typeof metadata !== "object") return [];
  const meta = metadata as Record<string, unknown>;
  if (!Array.isArray(meta.profileHistory)) return [];
  return meta.profileHistory
    .map((row) => parseProfileVersion(row, productName))
    .filter((row): row is ProductProfileVersion => row !== null);
}

export async function getProductIntakeDocument(productId: string): Promise<ProductIntakeDocument | null> {
  const product = await prisma.tenantProduct.findUnique({
    where: { id: productId },
    select: { name: true, metadata: true, intakeStatus: true, intakeRunId: true },
  });
  if (!product) return null;

  let versions = readProfileHistory(product.metadata, product.name);
  if (versions.length === 0) {
    const current = parseProductProfile(
      product.metadata && typeof product.metadata === "object"
        ? (product.metadata as Record<string, unknown>).profile
        : null,
    );
    if (current) {
      versions = [
        {
          id: "current",
          runId: product.intakeRunId,
          createdAt: current.updatedAt ?? new Date().toISOString(),
          profile: current,
          markdown: productProfileToMarkdown(product.name, current),
        },
      ];
    }
  }

  versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    productName: product.name,
    intakeStatus: product.intakeStatus,
    intakeRunId: product.intakeRunId,
    versions,
  };
}

export async function loadProductProfile(productId: string): Promise<ProductProfile | null> {
  const product = await prisma.tenantProduct.findUnique({
    where: { id: productId },
    select: { metadata: true },
  });
  if (!product?.metadata || typeof product.metadata !== "object") return null;
  const meta = product.metadata as Record<string, unknown>;
  return parseProductProfile(meta.profile ?? meta);
}

export async function saveProductProfile(
  productId: string,
  productSlug: string,
  profile: ProductProfile,
  options?: { runId?: string | null },
): Promise<void> {
  const product = await prisma.tenantProduct.findUnique({
    where: { id: productId },
    select: { metadata: true, description: true, phase: true, name: true },
  });
  if (!product) throw new Error("Product not found");

  const existingMeta =
    product.metadata && typeof product.metadata === "object"
      ? (product.metadata as Record<string, unknown>)
      : {};

  const stampedProfile = { ...profile, updatedAt: new Date().toISOString() };
  const version: ProductProfileVersion = {
    id: crypto.randomUUID(),
    runId: options?.runId ?? null,
    createdAt: stampedProfile.updatedAt!,
    profile: stampedProfile,
    markdown: productProfileToMarkdown(product.name, stampedProfile),
  };

  const history = readProfileHistory(existingMeta, product.name);
  history.unshift(version);

  const nextDescription = product.description?.trim()
    ? product.description
    : profile.summary.slice(0, 2000);

  await prisma.tenantProduct.update({
    where: { id: productId },
    data: {
      description: nextDescription,
      ...(profile.suggestedPhase ? { phase: profile.suggestedPhase } : {}),
      metadata: {
        ...existingMeta,
        profile: stampedProfile,
        profileHistory: history.slice(0, MAX_PROFILE_HISTORY).map((v) => ({
          id: v.id,
          runId: v.runId,
          createdAt: v.createdAt,
          profile: v.profile,
          markdown: v.markdown,
        })),
      } as unknown as Prisma.InputJsonValue,
    },
  });

  await syncProductProfileFile(productSlug, stampedProfile);
}

export async function syncProductProfileFile(
  productSlug: string,
  profile: ProductProfile,
): Promise<void> {
  const root = await ensureProductWorkspace(productSlug);
  await writeFile(
    join(root, PRODUCT_PROFILE_FILE),
    `${JSON.stringify({ ...profile, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf-8",
  );
}

export function productProfileToInitialMemory(
  product: {
    description: string | null;
    phase: ProductPhase;
    githubRepoUrl: string | null;
    metadata: unknown;
  },
  profile: ProductProfile | null,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    productDescription: product.description ?? profile?.summary ?? "",
    productPhase: product.phase,
    githubRepoUrl: product.githubRepoUrl,
  };
  if (profile) {
    base.productProfile = profile;
  }
  return base;
}
