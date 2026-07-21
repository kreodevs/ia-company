import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { AgentProvider } from "@prisma/client";
import type { ProviderConfig } from "../types/index.js";

export interface ProviderEnvConfig {
  tokenlab: { apiKey: string; baseURL: string };
  openrouter: { apiKey: string; baseURL: string };
  custom: { apiKey: string; baseURL: string };
}

export function getProviderEnvConfig(): ProviderEnvConfig {
  return {
    tokenlab: {
      apiKey: process.env.TOKENLAB_API_KEY ?? "",
      baseURL: process.env.TOKENLAB_BASE_URL ?? "https://api.lemondata.io/v1",
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY ?? "",
      baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    },
    custom: {
      apiKey: process.env.CUSTOM_API_KEY ?? "",
      baseURL: process.env.CUSTOM_BASE_URL ?? "",
    },
  };
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
      `Missing API key for provider "${config.provider}". Set the corresponding env variable.`,
    );
  }

  if (!baseURL) {
    throw new Error(
      `Missing base URL for provider "${config.provider}". Set the corresponding env variable.`,
    );
  }

  const client = createOpenAI({
    apiKey,
    baseURL,
    compatibility: "compatible",
    ...(config.provider === "openrouter"
      ? {
          headers: {
            "HTTP-Referer": process.env.OPENROUTER_REFERER ?? "https://auto-company.local",
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
