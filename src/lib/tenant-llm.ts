import type { AgentProvider } from "@prisma/client";
import { decryptSecret } from "./crypto.js";

export interface TenantLlmOverrides {
  provider?: AgentProvider | null;
  apiKey?: string | null;
  baseUrl?: string | null;
  defaultModel?: string | null;
  maxCostUsdPerRun?: number | null;
}

export function resolveAgentProviderConfig(
  agent: { provider: AgentProvider; model: string; temperature: number },
  tenant?: TenantLlmOverrides | null,
) {
  return {
    provider: tenant?.provider ?? agent.provider,
    model: tenant?.defaultModel ?? agent.model,
    temperature: agent.temperature,
    apiKey: decryptSecret(tenant?.apiKey),
    baseURL: tenant?.baseUrl ?? undefined,
  };
}

export function tenantLlmFromRecord(record: {
  provider: AgentProvider | null;
  apiKey: string | null;
  baseUrl: string | null;
  defaultModel: string | null;
  maxCostUsdPerRun: number | null;
} | null): TenantLlmOverrides | null {
  if (!record) return null;
  return {
    provider: record.provider,
    apiKey: record.apiKey,
    baseUrl: record.baseUrl,
    defaultModel: record.defaultModel,
    maxCostUsdPerRun: record.maxCostUsdPerRun,
  };
}
