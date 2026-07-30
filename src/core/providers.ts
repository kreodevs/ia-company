import { createOpenAI } from "@ai-sdk/openai";
import { APICallError } from "@ai-sdk/provider";
import type { AgentModelKind, AgentProvider } from "@prisma/client";
import type { LanguageModel } from "ai";
import type { ProviderConfig } from "../types/index.js";
import { getPlatformSettingsSync } from "../lib/platform-settings.js";
import type { ResolvedAgentLlmConfig } from "../lib/tenant-llm.js";
import { isMediaModelKind } from "../lib/tenant-llm.js";

export interface ProviderEnvConfig {
  tokenlab: { apiKey: string; baseURL: string };
  openrouter: { apiKey: string; baseURL: string };
  custom: { apiKey: string; baseURL: string };
  replicate: { apiKey: string; baseURL: string };
}

export function getProviderEnvConfig(): ProviderEnvConfig {
  return getPlatformSettingsSync().providers;
}

function resolveCredentials(config: ProviderConfig): { apiKey: string; baseURL: string } {
  const env = getProviderEnvConfig();

  if (config.apiKey && config.baseURL) {
    return { apiKey: config.apiKey, baseURL: config.baseURL };
  }

  const providerCreds = env[config.provider];
  return {
    apiKey: config.apiKey ?? providerCreds.apiKey,
    baseURL: config.baseURL ?? providerCreds.baseURL,
  };
}

export function isMediaModelConfig(
  config: Pick<ProviderConfig, "provider" | "modelKind">,
): boolean {
  return config.provider === "replicate" && Boolean(config.modelKind && isMediaModelKind(config.modelKind));
}

export function isReplicateChatConfig(
  config: Pick<ProviderConfig, "provider" | "modelKind">,
): boolean {
  return config.provider === "replicate" && (!config.modelKind || config.modelKind === "chat");
}

export function createLanguageModel(config: ProviderConfig): LanguageModel {
  if (config.provider === "replicate") {
    throw new Error(
      'Replicate agents use runReplicateStep() — chat/media models are not OpenAI-compatible.',
    );
  }

  const { apiKey, baseURL } = resolveCredentials(config);

  if (!apiKey) {
    throw new Error(
      `Missing API key for provider "${config.provider}". Configure it in Admin → Platform settings.`,
    );
  }

  if (!baseURL) {
    throw new Error(
      `Missing base URL for provider "${config.provider}". Configure it in Admin → Platform settings.`,
    );
  }

  const client = createOpenAI({
    apiKey,
    baseURL,
    compatibility: "compatible",
    ...(config.provider === "openrouter"
      ? {
          headers: {
            "HTTP-Referer": getPlatformSettingsSync().openrouterReferer,
            "X-Title": "Auto-Company Platform",
          },
        }
      : {}),
  });

  return client(config.model);
}

export function providerConfigFromResolved(resolved: ResolvedAgentLlmConfig): ProviderConfig {
  return {
    provider: resolved.provider,
    model: resolved.model,
    temperature: resolved.temperature,
    modelKind: resolved.modelKind,
  };
}

export function estimateCostUsd(
  _provider: AgentProvider,
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const rates: Record<string, { input: number; output: number }> = {
    "claude-3-5-sonnet-20241022": { input: 3 / 1_000_000, output: 15 / 1_000_000 },
    "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
    "gpt-4o": { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
  };

  const rate = rates[model] ?? { input: 1 / 1_000_000, output: 3 / 1_000_000 };
  return promptTokens * rate.input + completionTokens * rate.output;
}

export function providerDisplayName(provider: AgentProvider): string {
  const names: Record<AgentProvider, string> = {
    tokenlab: "TokenLab / LemonData",
    openrouter: "OpenRouter",
    custom: "Custom (OpenAI-compatible)",
    replicate: "Replicate",
  };
  return names[provider];
}

export function modelKindDisplayName(kind: AgentModelKind): string {
  const names: Record<AgentModelKind, string> = {
    chat: "Chat / text",
    image: "Image generation",
    audio: "Audio generation",
  };
  return names[kind];
}

export function findApiCallError(err: unknown): APICallError | null {
  let current: unknown = err;
  while (current) {
    if (current instanceof APICallError) return current;
    if (current && typeof current === "object") {
      const record = current as Record<string, unknown>;
      if (typeof record.responseBody === "string" && typeof record.statusCode === "number") {
        return new APICallError({
          message: typeof record.message === "string" ? record.message : "Provider returned error",
          url: typeof record.url === "string" ? record.url : "",
          requestBodyValues: {},
          statusCode: record.statusCode,
          responseHeaders: {},
          responseBody: record.responseBody,
        });
      }
    }
    if (current instanceof Error && current.cause) {
      current = current.cause;
      continue;
    }
    break;
  }
  return null;
}

export function formatLlmProviderError(
  err: unknown,
  config: { provider: string; model: string; modelKind?: AgentModelKind },
): string {
  if (!(err instanceof Error)) return String(err);

  const parts: string[] = [err.message];
  const cause = err.cause;
  if (cause instanceof Error && cause.message && !parts.includes(cause.message)) {
    parts.push(cause.message);
  } else if (cause && typeof cause === "object" && "message" in cause) {
    const msg = String((cause as { message: unknown }).message);
    if (msg && !parts.includes(msg)) parts.push(msg);
  }

  const apiErr = findApiCallError(err);
  if (apiErr) {
    if (apiErr.statusCode) parts.push(`HTTP ${apiErr.statusCode}`);
    const providerDetail = extractProviderResponseDetail(apiErr.responseBody);
    if (providerDetail && !parts.includes(providerDetail)) parts.push(providerDetail);
  }

  const kindHint = config.modelKind && config.modelKind !== "chat" ? ` (${config.modelKind})` : "";
  const combined = parts.join(" — ");
  if (/provider returned error|failed to fetch|401|403|404|429|400|invalid model|insufficient credits|user not found|replicate/i.test(combined)) {
    return `LLM ${config.provider}/${config.model}${kindHint} error: ${combined}. Check Admin → Platform settings (API key, base URL) and that the model id is valid on the provider.`;
  }
  return combined;
}

function extractProviderResponseDetail(responseBody: string | undefined): string | null {
  if (!responseBody?.trim()) return null;
  try {
    const parsed = JSON.parse(responseBody) as {
      error?: { message?: string; code?: number | string; metadata?: { raw?: string } };
      message?: string;
    };
    const nested = parsed.error?.message ?? parsed.message;
    if (nested?.trim()) return nested.trim();
  } catch {
    // fall through to raw body
  }
  const trimmed = responseBody.trim();
  return trimmed.length > 240 ? `${trimmed.slice(0, 240)}…` : trimmed;
}
