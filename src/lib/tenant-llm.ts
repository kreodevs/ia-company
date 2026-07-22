import type { AgentProvider } from "@prisma/client";
import { getPlatformSettingsSync } from "./platform-settings.js";

export interface TenantLlmOverrides {
  defaultModel?: string | null;
  maxCostUsdPerRun?: number | null;
}

export function resolveAgentProviderConfig(
  agent: { provider: AgentProvider; model: string; temperature: number },
  tenant?: TenantLlmOverrides | null,
) {
  const platform = getPlatformSettingsSync();

  return {
    provider: platform.defaultProvider,
    model: tenant?.defaultModel ?? platform.defaultModel ?? agent.model,
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
    defaultModel: record.defaultModel,
    maxCostUsdPerRun: record.maxCostUsdPerRun,
  };
}
