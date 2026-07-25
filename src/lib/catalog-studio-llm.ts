import { generateText } from "ai";
import { createLanguageModel } from "../core/providers.js";
import { getPlatformSettingsSync } from "./platform-settings.js";
import { prisma } from "./prisma.js";
import { resolveEffectiveModel, tenantLlmFromRecord } from "./tenant-llm.js";

export const CATALOG_STUDIO_MAX_TOKENS_PROPOSE = Number(process.env.CATALOG_STUDIO_MAX_TOKENS_PROPOSE ?? 900);
export const CATALOG_STUDIO_MAX_TOKENS_MUNGER = Number(process.env.CATALOG_STUDIO_MAX_TOKENS_MUNGER ?? 500);
export const CATALOG_STUDIO_PROPOSE_MAX_PER_HOUR = Number(
  process.env.CATALOG_STUDIO_PROPOSE_MAX_PER_HOUR ?? 30,
);

export function parseJsonFromLlm(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() ?? text.trim();
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function tenantLanguageModel(tenantId: string, temperature = 0.45) {
  const llmConfig = await prisma.tenantLlmConfig.findUnique({ where: { tenantId } });
  const platform = getPlatformSettingsSync();
  const tenantLlm = tenantLlmFromRecord(llmConfig);
  const { model } = resolveEffectiveModel("inherit", tenantLlm);
  return createLanguageModel({
    provider: platform.defaultProvider,
    model,
    temperature,
  });
}

export async function assertCatalogStudioProposeRateLimit(tenantId: string): Promise<void> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.auditLog.count({
    where: {
      tenantId,
      action: { in: ["catalog_studio.skill.propose", "catalog_studio.agent.propose"] },
      createdAt: { gte: since },
    },
  });
  if (count >= CATALOG_STUDIO_PROPOSE_MAX_PER_HOUR) {
    throw new Error(
      `Rate limit: max ${CATALOG_STUDIO_PROPOSE_MAX_PER_HOUR} catalog proposals per hour. Try again later.`,
    );
  }
}

export async function generateCatalogJson(
  tenantId: string,
  system: string,
  prompt: string,
  maxTokens: number,
  temperature = 0.45,
): Promise<Record<string, unknown> | null> {
  const model = await tenantLanguageModel(tenantId, temperature);
  const result = await generateText({
    model,
    system,
    prompt,
    maxTokens,
  });
  return parseJsonFromLlm(result.text);
}
