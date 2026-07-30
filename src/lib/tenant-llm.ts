import type { AgentModelKind, AgentProvider } from "@prisma/client";
import { getPlatformSettingsSync, type ResolvedPlatformSettings } from "./platform-settings.js";

export interface TenantLlmOverrides {
  defaultModel?: string | null;
  defaultProvider?: AgentProvider | null;
  maxCostUsdPerRun?: number | null;
}

export type EffectiveConfigSource = "agent" | "tenant" | "platform";

export interface ResolvedAgentLlmConfig {
  provider: AgentProvider;
  model: string;
  modelKind: AgentModelKind;
  temperature: number;
  providerSource: EffectiveConfigSource;
  modelSource: EffectiveConfigSource;
  modelKindSource: EffectiveConfigSource;
}

function normalizeModel(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveEffectiveProvider(
  agentProvider: AgentProvider | null | undefined,
  tenant?: TenantLlmOverrides | null,
  platform?: Pick<ResolvedPlatformSettings, "defaultProvider">,
): { provider: AgentProvider; source: EffectiveConfigSource } {
  if (agentProvider) {
    return { provider: agentProvider, source: "agent" };
  }

  const tenantProvider = tenant?.defaultProvider ?? null;
  if (tenantProvider) {
    return { provider: tenantProvider, source: "tenant" };
  }

  const platformProvider = platform?.defaultProvider ?? getPlatformSettingsSync().defaultProvider;
  return { provider: platformProvider, source: "platform" };
}

export type EffectiveModelSource = EffectiveConfigSource;

export function resolveEffectiveModel(
  agentModel: string | null | undefined,
  tenant?: TenantLlmOverrides | null,
  platform?: Pick<ResolvedPlatformSettings, "defaultModel">,
): { model: string; source: EffectiveModelSource } {
  const agentResolved = normalizeModel(agentModel);
  if (agentResolved) {
    return { model: agentResolved, source: "agent" };
  }

  const tenantModel = normalizeModel(tenant?.defaultModel);
  if (tenantModel) {
    return { model: tenantModel, source: "tenant" };
  }

  const platformModel = normalizeModel(platform?.defaultModel ?? getPlatformSettingsSync().defaultModel);
  if (platformModel) {
    return { model: platformModel, source: "platform" };
  }

  throw new Error(
    "Platform default model is not configured. Set it in Admin → Platform settings.",
  );
}

export function resolveEffectiveModelKind(
  agentModelKind: AgentModelKind | null | undefined,
): { modelKind: AgentModelKind; source: EffectiveConfigSource } {
  if (agentModelKind) {
    return { modelKind: agentModelKind, source: "agent" };
  }
  return { modelKind: "chat", source: "platform" };
}

export function resolveAgentProviderConfig(
  agent: {
    provider?: AgentProvider | null;
    model?: string | null;
    modelKind?: AgentModelKind | null;
    temperature: number;
  },
  tenant?: TenantLlmOverrides | null,
  platform?: ResolvedPlatformSettings,
): ResolvedAgentLlmConfig {
  const resolvedPlatform = platform ?? getPlatformSettingsSync();
  const providerResult = resolveEffectiveProvider(agent.provider, tenant, resolvedPlatform);
  const modelResult = resolveEffectiveModel(agent.model, tenant, resolvedPlatform);
  const modelKindResult = resolveEffectiveModelKind(agent.modelKind);

  return {
    provider: providerResult.provider,
    model: modelResult.model,
    modelKind: modelKindResult.modelKind,
    temperature: agent.temperature,
    providerSource: providerResult.source,
    modelSource: modelResult.source,
    modelKindSource: modelKindResult.source,
  };
}

/** Platform/tenant defaults for non-agent LLM calls (coordinator, catalog studio, etc.). */
export function resolvePlatformLlmConfig(
  tenant?: TenantLlmOverrides | null,
  overrides?: { temperature?: number },
): ResolvedAgentLlmConfig {
  return resolveAgentProviderConfig(
    {
      provider: null,
      model: null,
      modelKind: "chat",
      temperature: overrides?.temperature ?? getPlatformSettingsSync().defaultTemperature,
    },
    tenant,
  );
}

const CHAT_PROVIDER_FALLBACK_ORDER: AgentProvider[] = ["openrouter", "tokenlab", "custom"];

/** Chat + tools paths (coordinator, MCP probe) — never Replicate/media. */
export function resolveChatLlmConfig(
  tenant?: TenantLlmOverrides | null,
  overrides?: { temperature?: number },
): ResolvedAgentLlmConfig {
  const resolved = resolvePlatformLlmConfig(tenant, overrides);
  if (resolved.provider !== "replicate" && !isMediaModelKind(resolved.modelKind)) {
    return resolved;
  }

  const platform = getPlatformSettingsSync();
  for (const provider of CHAT_PROVIDER_FALLBACK_ORDER) {
    if (!platform.providers[provider]?.apiKey) continue;
    return resolveAgentProviderConfig(
      {
        provider,
        model: null,
        modelKind: "chat",
        temperature: overrides?.temperature ?? platform.defaultTemperature,
      },
      tenant,
      platform,
    );
  }

  throw new Error(
    "No chat LLM provider configured (OpenRouter, TokenLab, or Custom). Replicate is for per-agent media/chat models only.",
  );
}

export function tenantLlmFromRecord(record: {
  defaultModel: string | null;
  defaultProvider?: AgentProvider | null;
  maxCostUsdPerRun: number | null;
} | null): TenantLlmOverrides | null {
  if (!record) return null;
  return {
    defaultModel: normalizeModel(record.defaultModel),
    defaultProvider: record.defaultProvider ?? null,
    maxCostUsdPerRun: record.maxCostUsdPerRun,
  };
}

export function isMediaModelKind(modelKind: AgentModelKind): boolean {
  return modelKind === "image" || modelKind === "audio";
}
