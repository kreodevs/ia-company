import type { AgentProvider } from "@prisma/client";
import { getPlatformSettingsSync, type ResolvedPlatformSettings } from "./platform-settings.js";

export interface TenantLlmOverrides {
  defaultModel?: string | null;
  maxCostUsdPerRun?: number | null;
}

export type EffectiveModelSource = "tenant" | "platform" | "agent";

function normalizeModel(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveEffectiveModel(
  agentModel: string,
  tenant?: TenantLlmOverrides | null,
  platform?: Pick<ResolvedPlatformSettings, "defaultModel">,
): { model: string; source: EffectiveModelSource } {
  const tenantModel = normalizeModel(tenant?.defaultModel);
  if (tenantModel) {
    return { model: tenantModel, source: "tenant" };
  }

  const platformModel = normalizeModel(platform?.defaultModel ?? getPlatformSettingsSync().defaultModel);
  if (platformModel) {
    return { model: platformModel, source: "platform" };
  }

  return { model: agentModel, source: "agent" };
}

export function resolveAgentProviderConfig(
  agent: { provider: AgentProvider; model: string; temperature: number },
  tenant?: TenantLlmOverrides | null,
) {
  const platform = getPlatformSettingsSync();
  const { model } = resolveEffectiveModel(agent.model, tenant, platform);

  return {
    provider: platform.defaultProvider,
    model,
    temperature: agent.temperature,
    apiKey: undefined,
    baseURL: undefined,
  };
}

export function tenantLlmFromRecord(record: {
  defaultModel: string | null;
  maxCostUsdPerRun: number | null;
} | null): TenantLlmOverrides | null {
  if (!record) return null;
  return {
    defaultModel: normalizeModel(record.defaultModel),
    maxCostUsdPerRun: record.maxCostUsdPerRun,
  };
}
