import type { AgentProvider } from "@prisma/client";
import { getPlatformSettings } from "./platform-settings.js";

export interface LlmModelOption {
  id: string;
  name: string;
  inputPer1MTokens: number | null;
  outputPer1MTokens: number | null;
  currency: "USD";
}

type CacheEntry = { expiresAt: number; models: LlmModelOption[] };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function parsePer1M(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function perTokenUsdToPer1M(value: unknown): number | null {
  const perToken = parsePer1M(value);
  if (perToken === null) return null;
  return perToken * 1_000_000;
}

function normalizeQuery(q: string | undefined): string {
  return (q ?? "").trim().toLowerCase();
}

function filterModels(models: LlmModelOption[], q: string | undefined): LlmModelOption[] {
  const query = normalizeQuery(q);
  if (!query) return models;
  return models.filter(
    (m) =>
      m.id.toLowerCase().includes(query) ||
      m.name.toLowerCase().includes(query),
  );
}

async function fetchOpenRouterModels(): Promise<LlmModelOption[]> {
  const settings = await getPlatformSettings();
  const baseUrl = settings.providers.openrouter.baseURL.replace(/\/$/, "");
  const headers: Record<string, string> = { Accept: "application/json" };
  const apiKey = settings.providers.openrouter.apiKey;
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(`${baseUrl}/models`, { headers });
  if (!res.ok) {
    throw new Error(`OpenRouter models request failed (${res.status})`);
  }

  const body = (await res.json()) as {
    data?: Array<{
      id: string;
      name?: string;
      architecture?: { output_modalities?: string[] };
      pricing?: { prompt?: string; completion?: string };
    }>;
  };

  return (body.data ?? [])
    .filter((m) => {
      const outputs = m.architecture?.output_modalities;
      return !outputs || outputs.includes("text");
    })
    .map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
      inputPer1MTokens: perTokenUsdToPer1M(m.pricing?.prompt),
      outputPer1MTokens: perTokenUsdToPer1M(m.pricing?.completion),
      currency: "USD" as const,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

type TokenlabPricingRow = {
  model?: string;
  input_per_1m_tokens?: string | number;
  output_per_1m_tokens?: string | number;
};

type TokenlabModelRow = {
  id: string;
  owned_by?: string;
  tokenlab?: {
    pricing?: {
      input_per_1m_tokens?: string | number;
      output_per_1m_tokens?: string | number;
      prompt?: string | number;
      completion?: string | number;
    };
  };
};

async function fetchTokenlabModels(): Promise<LlmModelOption[]> {
  const settings = await getPlatformSettings();
  const apiKey = settings.providers.tokenlab.apiKey;
  if (!apiKey) {
    throw new Error(
      'Missing API key for provider "tokenlab". Configure it in Admin → Platform settings.',
    );
  }

  const baseUrl = settings.providers.tokenlab.baseURL.replace(/\/$/, "");
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const [modelsRes, pricingRes] = await Promise.all([
    fetch(`${baseUrl}/models`, { headers }),
    fetch(`${baseUrl}/pricing?tag=chat`, { headers }),
  ]);

  if (!modelsRes.ok) {
    throw new Error(`TokenLab models request failed (${modelsRes.status})`);
  }

  const modelsBody = (await modelsRes.json()) as { data?: TokenlabModelRow[] };
  const pricingByModel = new Map<string, TokenlabPricingRow>();

  if (pricingRes.ok) {
    const pricingBody = (await pricingRes.json()) as { data?: TokenlabPricingRow[] };
    for (const row of pricingBody.data ?? []) {
      if (row.model) pricingByModel.set(row.model, row);
    }
  }

  return (modelsBody.data ?? [])
    .map((m) => {
      const pricing = pricingByModel.get(m.id);
      const ext = m.tokenlab?.pricing;
      const inputPer1M =
        parsePer1M(pricing?.input_per_1m_tokens) ??
        parsePer1M(ext?.input_per_1m_tokens) ??
        perTokenUsdToPer1M(ext?.prompt);
      const outputPer1M =
        parsePer1M(pricing?.output_per_1m_tokens) ??
        parsePer1M(ext?.output_per_1m_tokens) ??
        perTokenUsdToPer1M(ext?.completion);

      return {
        id: m.id,
        name: m.id,
        inputPer1MTokens: inputPer1M,
        outputPer1MTokens: outputPer1M,
        currency: "USD" as const,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function getCachedModels(provider: "openrouter" | "tokenlab"): Promise<LlmModelOption[]> {
  const now = Date.now();
  const hit = cache.get(provider);
  if (hit && hit.expiresAt > now) return hit.models;

  const models =
    provider === "openrouter" ? await fetchOpenRouterModels() : await fetchTokenlabModels();
  cache.set(provider, { models, expiresAt: now + CACHE_TTL_MS });
  return models;
}

export function invalidateProviderModelsCache(provider?: "openrouter" | "tokenlab"): void {
  if (provider) cache.delete(provider);
  else cache.clear();
}

export async function listProviderModels(
  provider: AgentProvider,
  query?: string,
): Promise<LlmModelOption[]> {
  if (provider === "custom") {
    return [];
  }
  if (provider !== "openrouter" && provider !== "tokenlab") {
    throw new Error(`Unsupported provider "${provider}" for model catalog.`);
  }

  const models = await getCachedModels(provider);
  return filterModels(models, query);
}
