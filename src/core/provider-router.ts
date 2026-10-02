/**
 * ProviderRouter — Fase 0 (camino B).
 * Elige modelo OpenRouter/OpenAI-compatible para sesiones multi-turno.
 * Valida capability tool-calling con fallback automático; nunca silent.
 */

import type { AgentModelKind, AgentProvider } from "@prisma/client";
import { getPlatformSettingsSync } from "../lib/platform-settings.js";
import {
  resolveAgentProviderConfig,
  tenantLlmFromRecord,
  type ResolvedAgentLlmConfig,
} from "../lib/tenant-llm.js";
import { isMediaModelKind } from "../lib/tenant-llm.js";
import { prisma } from "../lib/prisma.js";

export type ModelTier = "brain" | "executor" | "cheap";

export interface ModelCapability {
  supportsTools: boolean;
  contextWindow: number;
  inputPer1M: number;
  outputPer1M: number;
  tier: ModelTier;
}

// Tabla mínima verificable; el resto se considera tool-capable por defecto si es chat.
const KNOWN_CAPABILITIES: Record<string, ModelCapability> = {
  "claude-3-5-sonnet-20241022": {
    supportsTools: true,
    contextWindow: 200_000,
    inputPer1M: 3,
    outputPer1M: 15,
    tier: "brain",
  },
  "claude-3-5-haiku-20241022": {
    supportsTools: true,
    contextWindow: 200_000,
    inputPer1M: 0.8,
    outputPer1M: 4,
    tier: "cheap",
  },
  "gpt-4o": { supportsTools: true, contextWindow: 128_000, inputPer1M: 2.5, outputPer1M: 10, tier: "brain" },
  "gpt-4o-mini": { supportsTools: true, contextWindow: 128_000, inputPer1M: 0.15, outputPer1M: 0.6, tier: "cheap" },
  "gpt-4.1-mini": { supportsTools: true, contextWindow: 1_000_000, inputPer1M: 0.4, outputPer1M: 1.6, tier: "executor" },
  "gemini-2.0-flash-001": { supportsTools: true, contextWindow: 1_000_000, inputPer1M: 0.1, outputPer1M: 0.4, tier: "executor" },
  // OpenRouter aliases comunes
  "openai/gpt-4o-mini": { supportsTools: true, contextWindow: 128_000, inputPer1M: 0.15, outputPer1M: 0.6, tier: "cheap" },
  "anthropic/claude-3.5-sonnet": { supportsTools: true, contextWindow: 200_000, inputPer1M: 3, outputPer1M: 15, tier: "brain" },
};

const TOOL_FALLBACK_ORDER: Array<{ provider: AgentProvider; model: string }> = [
  { provider: "openrouter", model: "openai/gpt-4o-mini" },
  { provider: "openrouter", model: "gpt-4o-mini" },
  { provider: "tokenlab", model: "gpt-4o-mini" },
  { provider: "custom", model: "gpt-4o-mini" },
];

export function getModelCapability(model: string): ModelCapability | null {
  return KNOWN_CAPABILITIES[model] ?? null;
}

export function modelSupportsTools(model: string, modelKind: AgentModelKind): boolean {
  if (isMediaModelKind(modelKind)) return false;
  const known = KNOWN_CAPABILITIES[model];
  if (known) return known.supportsTools;
  // Desconocido pero chat → asumir que soporta tools si no es replicate media.
  // Replicate chat no es OpenAI-compatible en este codebase.
  return true;
}

export interface ResolveSessionLlmInput {
  agent: { provider?: AgentProvider | null; model?: string | null; modelKind?: AgentModelKind | null; temperature: number };
  tenantId?: string | null;
}

export interface ResolvedSessionLlm {
  config: ResolvedAgentLlmConfig;
  capability: ModelCapability | null;
  fellBack: boolean;
  fallbackReason?: string;
}

export async function resolveSessionLlmConfig(input: ResolveSessionLlmInput): Promise<ResolvedSessionLlm> {
  const platform = getPlatformSettingsSync();
  let tenantOverrides: ReturnType<typeof tenantLlmFromRecord> = null;
  if (input.tenantId) {
    const rec = await prisma.tenantLlmConfig.findUnique({ where: { tenantId: input.tenantId } });
    tenantOverrides = tenantLlmFromRecord(rec as never);
  }

  const resolved = resolveAgentProviderConfig(input.agent, tenantOverrides, platform);
  const supports = modelSupportsTools(resolved.model, resolved.modelKind);

  if (supports && resolved.provider !== "replicate") {
    return { config: resolved, capability: getModelCapability(resolved.model), fellBack: false };
  }

  const reason = !supports
    ? `Model ${resolved.model} does not support tool-calling`
    : `Provider ${resolved.provider} is not OpenAI-compatible for sessions`;

  for (const fb of TOOL_FALLBACK_ORDER) {
    const apiKey = platform.providers[fb.provider]?.apiKey;
    if (!apiKey) continue;
    // Usar fb como override de agente
    const fallbackResolved = resolveAgentProviderConfig(
      { provider: fb.provider, model: fb.model, modelKind: "chat", temperature: input.agent.temperature },
      tenantOverrides,
      platform,
    );
    if (modelSupportsTools(fallbackResolved.model, fallbackResolved.modelKind)) {
      return {
        config: fallbackResolved,
        capability: getModelCapability(fallbackResolved.model),
        fellBack: true,
        fallbackReason: reason,
      };
    }
  }

  throw new Error(
    `${reason}. No fallback tool-capable provider is configured. Set OpenRouter API key in Admin → Platform settings.`,
  );
}

export function estimateSessionCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const cap = KNOWN_CAPABILITIES[model];
  if (!cap) return promptTokens * (1 / 1_000_000) + completionTokens * (3 / 1_000_000);
  return promptTokens * (cap.inputPer1M / 1_000_000) + completionTokens * (cap.outputPer1M / 1_000_000);
}
