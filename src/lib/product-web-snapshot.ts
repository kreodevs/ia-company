import { generateText } from "ai";
import type { Prisma } from "@prisma/client";
import { createLanguageModel, providerConfigFromResolved } from "../core/providers.js";
import { prisma } from "./prisma.js";
import { resolveChatLlmConfig, tenantLlmFromRecord } from "./tenant-llm.js";
import { normalizeProductUrl } from "./product-urls.js";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 800_000;
const MAX_PLAIN_CHARS = 24_000;
const MAX_PROMPT_CHARS = 4_500;
const SNAPSHOT_TTL_MS = 12 * 60 * 60 * 1000;

export type ProductWebPageKind = "website" | "pricing";

export interface ProductWebPageSnapshot {
  kind: ProductWebPageKind;
  url: string;
  fetchedAt: string;
  title: string | null;
  summary: string;
  error: string | null;
}

export interface ProductWebSnapshots {
  website: ProductWebPageSnapshot | null;
  pricing: ProductWebPageSnapshot | null;
}

interface StoredWebSnapshotsMeta {
  websiteUrl?: string | null;
  pricingPageUrl?: string | null;
  website?: ProductWebPageSnapshot | null;
  pricing?: ProductWebPageSnapshot | null;
}

export function htmlToPlainText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  text = text.replace(/<[^>]+>/g, " ");
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  return text.replace(/\s+/g, " ").trim();
}

export function extractHtmlTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) return null;
  return htmlToPlainText(match[1]).slice(0, 200) || null;
}

export function buildPlainTextExcerpt(text: string, kind: ProductWebPageKind): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const priceLines = normalized
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) =>
      kind === "pricing"
        ? /(\$|€|USD|MXN|\/mes|\/month|pricing|precio|tier|plan|gratis|free)/i.test(sentence)
        : false,
    )
    .slice(0, 12);

  const head = normalized.slice(0, kind === "pricing" ? 6_000 : 4_000);
  if (priceLines.length === 0) {
    return head.length > MAX_PLAIN_CHARS ? `${head.slice(0, MAX_PLAIN_CHARS)}…` : head;
  }

  const combined = [head, "", "--- Pricing signals ---", priceLines.join(" ")].join("\n");
  return combined.length > MAX_PLAIN_CHARS ? `${combined.slice(0, MAX_PLAIN_CHARS)}…` : combined;
}

export function assertPublicHttpUrl(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    host.startsWith("172.16.") ||
    host === "[::1]"
  ) {
    throw new Error("Private or local URLs are not allowed");
  }
}

export async function fetchPublicWebPage(url: string): Promise<{ title: string | null; text: string }> {
  const normalized = normalizeProductUrl(url);
  if (!normalized) throw new Error("Invalid URL");
  assertPublicHttpUrl(normalized);

  const response = await fetch(normalized, {
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      "User-Agent": "Auto-Company-ProductSnapshot/1.0 (+https://auto-company.local)",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new Error(`Unsupported content type: ${contentType.split(";")[0] || "unknown"}`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_HTML_BYTES) {
    throw new Error("Page too large");
  }

  const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const title = extractHtmlTitle(html);
  const text = htmlToPlainText(html);
  if (!text || text.length < 40) {
    throw new Error("Page has insufficient readable text");
  }

  return { title, text };
}

async function summarizeWebPageContent(input: {
  tenantId: string;
  kind: ProductWebPageKind;
  url: string;
  excerpt: string;
}): Promise<string> {
  const llmConfig = await prisma.tenantLlmConfig.findUnique({ where: { tenantId: input.tenantId } });
  const tenantLlm = tenantLlmFromRecord(llmConfig);
  const resolved = resolveChatLlmConfig(tenantLlm, { temperature: 0.2 });
  const languageModel = createLanguageModel(providerConfigFromResolved(resolved));

  const system =
    input.kind === "pricing"
      ? `Resume el contenido de una página pública de pricing para agentes de negocio.
Extrae tiers/planes, precios, moneda, límites, trial/freemium y reglas visibles.
No inventes datos que no aparezcan en el texto. Español si el contenido está en español.
Formato markdown breve con bullets. Máximo 350 palabras.`
      : `Resume el contenido de la web pública de un producto para agentes de negocio.
Incluye propuesta de valor, audiencia, funcionalidades clave y CTA visibles.
No inventes datos que no aparezcan en el texto. Español si el contenido está en español.
Formato markdown breve. Máximo 300 palabras.`;

  const result = await generateText({
    model: languageModel,
    temperature: 0.2,
    system,
    prompt: `URL: ${input.url}\n\nContenido extraído:\n${input.excerpt.slice(0, 12_000)}`,
    maxSteps: 1,
  });

  const summary = result.text.trim();
  if (!summary) throw new Error("Empty summary");
  return summary.length > MAX_PROMPT_CHARS ? `${summary.slice(0, MAX_PROMPT_CHARS)}…` : summary;
}

function readStoredSnapshots(metadata: unknown): StoredWebSnapshotsMeta {
  if (!metadata || typeof metadata !== "object") return {};
  const raw = (metadata as Record<string, unknown>).webSnapshots;
  if (!raw || typeof raw !== "object") return {};
  return raw as StoredWebSnapshotsMeta;
}

function snapshotIsFresh(
  snapshot: ProductWebPageSnapshot | null | undefined,
  url: string | null | undefined,
): boolean {
  if (!snapshot || !url?.trim()) return false;
  if (snapshot.url !== normalizeProductUrl(url)) return false;
  if (snapshot.error) return false;
  const age = Date.now() - new Date(snapshot.fetchedAt).getTime();
  return age >= 0 && age < SNAPSHOT_TTL_MS;
}

async function fetchAndSummarizePage(input: {
  tenantId: string;
  kind: ProductWebPageKind;
  url: string;
}): Promise<ProductWebPageSnapshot> {
  const normalized = normalizeProductUrl(input.url);
  if (!normalized) {
    return {
      kind: input.kind,
      url: input.url,
      fetchedAt: new Date().toISOString(),
      title: null,
      summary: "",
      error: "Invalid URL",
    };
  }

  try {
    const { title, text } = await fetchPublicWebPage(normalized);
    const excerpt = buildPlainTextExcerpt(text, input.kind);
    let summary = excerpt.slice(0, MAX_PROMPT_CHARS);
    try {
      summary = await summarizeWebPageContent({
        tenantId: input.tenantId,
        kind: input.kind,
        url: normalized,
        excerpt,
      });
    } catch {
      // LLM unavailable — use excerpt fallback
    }

    return {
      kind: input.kind,
      url: normalized,
      fetchedAt: new Date().toISOString(),
      title,
      summary,
      error: null,
    };
  } catch (err) {
    return {
      kind: input.kind,
      url: normalized,
      fetchedAt: new Date().toISOString(),
      title: null,
      summary: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function loadOrRefreshProductWebSnapshots(
  tenantId: string,
  productId: string,
  options?: { force?: boolean },
): Promise<ProductWebSnapshots> {
  const product = await prisma.tenantProduct.findFirst({
    where: { id: productId, tenantId },
    select: { id: true, metadata: true, websiteUrl: true, pricingPageUrl: true },
  });
  if (!product) {
    return { website: null, pricing: null };
  }

  const stored = readStoredSnapshots(product.metadata);
  const websiteUrl = product.websiteUrl?.trim() || null;
  const pricingPageUrl = product.pricingPageUrl?.trim() || null;

  let website = !options?.force && snapshotIsFresh(stored.website, websiteUrl) ? stored.website! : null;
  let pricing = !options?.force && snapshotIsFresh(stored.pricing, pricingPageUrl) ? stored.pricing! : null;

  const normalizedWebsite = websiteUrl ? normalizeProductUrl(websiteUrl) : null;
  const normalizedPricing = pricingPageUrl ? normalizeProductUrl(pricingPageUrl) : null;
  const sameUrl =
    normalizedWebsite && normalizedPricing && normalizedWebsite === normalizedPricing;
  const needsWebsite = Boolean(websiteUrl && (!website || options?.force));
  const needsPricing = Boolean(pricingPageUrl && (!pricing || options?.force));

  if (sameUrl && normalizedWebsite && (needsWebsite || needsPricing)) {
    const shared = await fetchAndSummarizePage({
      tenantId,
      kind: "pricing",
      url: normalizedWebsite,
    });
    website = { ...shared, kind: "website" };
    pricing = shared;
  } else {
    if (websiteUrl && needsWebsite) {
      website = await fetchAndSummarizePage({ tenantId, kind: "website", url: websiteUrl });
    } else if (!websiteUrl) {
      website = null;
    }

    if (pricingPageUrl && needsPricing) {
      pricing = await fetchAndSummarizePage({ tenantId, kind: "pricing", url: pricingPageUrl });
    } else if (!pricingPageUrl) {
      pricing = null;
    }
  }

  const nextMeta: StoredWebSnapshotsMeta = {
    websiteUrl,
    pricingPageUrl,
    website,
    pricing,
  };

  const baseMeta =
    product.metadata && typeof product.metadata === "object"
      ? { ...(product.metadata as Record<string, unknown>) }
      : {};

  await prisma.tenantProduct.update({
    where: { id: product.id },
    data: {
      metadata: {
        ...baseMeta,
        webSnapshots: nextMeta,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return { website, pricing };
}

export function buildProductWebSnapshotPromptSection(snapshots: ProductWebSnapshots): string {
  const blocks: string[] = [];
  const sameContent =
    snapshots.website?.url &&
    snapshots.pricing?.url &&
    snapshots.website.url === snapshots.pricing.url &&
    snapshots.website.summary === snapshots.pricing.summary &&
    !snapshots.website.error &&
    !snapshots.pricing.error;

  if (sameContent && snapshots.pricing?.summary) {
    blocks.push(
      `### Sitio y pricing (misma URL — contenido leído)\nURL: ${snapshots.pricing.url}${
        snapshots.pricing.title ? `\nTítulo: ${snapshots.pricing.title}` : ""
      }\n\n${snapshots.pricing.summary}\n\n**No inventes tiers ni precios distintos a los anteriores.**`,
    );
  } else {
    if (snapshots.website?.summary && !snapshots.website.error) {
      blocks.push(
        `### Sitio web (contenido leído)\nURL: ${snapshots.website.url}${
          snapshots.website.title ? `\nTítulo: ${snapshots.website.title}` : ""
        }\n\n${snapshots.website.summary}`,
      );
    } else if (snapshots.website?.error) {
      blocks.push(
        `### Sitio web\nURL: ${snapshots.website.url}\n(No se pudo leer: ${snapshots.website.error})`,
      );
    }

    if (snapshots.pricing?.summary && !snapshots.pricing.error) {
      blocks.push(
        `### Pricing publicado (contenido leído — fuente autoritativa)\nURL: ${snapshots.pricing.url}${
          snapshots.pricing.title ? `\nTítulo: ${snapshots.pricing.title}` : ""
        }\n\n${snapshots.pricing.summary}\n\n**No inventes tiers ni precios distintos a los anteriores.**`,
      );
    } else if (snapshots.pricing?.error) {
      blocks.push(
        `### Pricing publicado\nURL: ${snapshots.pricing.url}\n(No se pudo leer: ${snapshots.pricing.error})`,
      );
    }
  }

  if (blocks.length === 0) return "";
  return ["## Contexto web del producto (fetch automático)", ...blocks].join("\n\n");
}

export function productWebSnapshotMemoryFields(
  snapshots: ProductWebSnapshots,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (snapshots.website?.summary && !snapshots.website.error) {
    fields.productWebsiteSnapshot = snapshots.website.summary;
    fields.productWebsiteUrl = snapshots.website.url;
  }
  if (snapshots.pricing?.summary && !snapshots.pricing.error) {
    fields.productPricingSnapshot = snapshots.pricing.summary;
    fields.productPricingPageUrl = snapshots.pricing.url;
  }
  return fields;
}

export function readProductWebSnapshotMeta(metadata: unknown): {
  fetchedAt: string | null;
  hasError: boolean;
} {
  const stored = readStoredSnapshots(metadata);
  const dates = [stored.website?.fetchedAt, stored.pricing?.fetchedAt].filter(Boolean) as string[];
  const fetchedAt =
    dates.length > 0
      ? dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]!
      : null;
  const hasError = Boolean(stored.website?.error || stored.pricing?.error);
  return { fetchedAt, hasError };
}

export function clearProductWebSnapshotsMetadata(metadata: unknown): Record<string, unknown> {
  const base =
    metadata && typeof metadata === "object" ? { ...(metadata as Record<string, unknown>) } : {};
  delete base.webSnapshots;
  return base;
}
