import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { AgentProvider } from "@prisma/client";
import type { ProviderConfig } from "../types/index.js";
import { getPlatformSettingsSync } from "../lib/platform-settings.js";

export interface ProviderEnvConfig {
  tokenlab: { apiKey: string; baseURL: string };
  openrouter: { apiKey: string; baseURL: string };
  custom: { apiKey: string; baseURL: string };
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

export function createLanguageModel(config: ProviderConfig): LanguageModel {
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

export function estimateCostUsd(
  _provider: AgentProvider,
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  // Rough defaults — override via cost table in production
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
  };
  return names[provider];
}

export function formatLlmProviderError(
  err: unknown,
  config: { provider: string; model: string },
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

  const combined = parts.join(" — ");
  if (/provider returned error|failed to fetch|401|403|404|429|invalid model/i.test(combined)) {
    return `LLM ${config.provider}/${config.model} error: ${combined}. Check Admin → Platform settings (API key, base URL) and that the model id is valid on the provider.`;
  }
  return combined;
}
