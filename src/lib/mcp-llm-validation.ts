import { generateText, jsonSchema, tool } from "ai";
import { createLanguageModel, findApiCallError, formatLlmProviderError, providerConfigFromResolved } from "../core/providers.js";
import { getPlatformSettings } from "./platform-settings.js";
import { resolveChatLlmConfig } from "./tenant-llm.js";
import {
  buildMcpToolKey,
  parseMcpInputSchemaJson,
  sanitizeMcpToolDescription,
} from "./mcp-tool-schema.js";

export interface McpToolDefinitionLike {
  serverSlug: string;
  toolName: string;
  description: string | null;
  inputSchemaJson: string;
}

export interface McpLlmValidationResult {
  ok: boolean;
  provider: string;
  model: string;
  toolCount: number;
  error?: string;
  statusCode?: number | null;
  responseBody?: string | null;
  skippedTools?: Array<{ toolName: string; reason: string }>;
}

export function buildProbeToolsFromDefinitions(
  defs: McpToolDefinitionLike[],
  maxTools: number = 24,
): {
  tools: Record<string, unknown>;
  skippedTools: Array<{ toolName: string; reason: string }>;
} {
  const tools: Record<string, unknown> = {};
  const skippedTools: Array<{ toolName: string; reason: string }> = [];

  for (const def of defs.slice(0, maxTools)) {
    try {
      const schema = parseMcpInputSchemaJson(def.inputSchemaJson);
      const toolKey = buildMcpToolKey(def.serverSlug, def.toolName);
      tools[toolKey] = tool({
        description: `[MCP:${def.serverSlug}] ${sanitizeMcpToolDescription(def.description)}`,
        parameters: jsonSchema(schema),
        execute: async () => ({ ok: true, probe: true }),
      });
    } catch (err) {
      skippedTools.push({
        toolName: def.toolName,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { tools, skippedTools };
}

export async function validateMcpToolsWithPlatformLlm(
  defs: McpToolDefinitionLike[],
): Promise<McpLlmValidationResult> {
  const settings = await getPlatformSettings();
  const resolved = resolveChatLlmConfig(null, { temperature: settings.defaultTemperature });
  const providerConfig = providerConfigFromResolved(resolved);

  const { tools, skippedTools } = buildProbeToolsFromDefinitions(defs);
  const toolCount = Object.keys(tools).length;

  if (toolCount === 0) {
    return {
      ok: false,
      provider: resolved.provider,
      model: resolved.model,
      toolCount: 0,
      error: "No LLM-compatible MCP tools to validate",
      skippedTools,
    };
  }

  const model = createLanguageModel(providerConfig);

  try {
    await generateText({
      model,
      prompt: "Reply with exactly: MCP OK",
      tools: tools as unknown as NonNullable<Parameters<typeof generateText>[0]["tools"]>,
      maxSteps: 1,
    });

    return {
      ok: true,
      provider: resolved.provider,
      model: resolved.model,
      toolCount,
      skippedTools: skippedTools.length > 0 ? skippedTools : undefined,
    };
  } catch (err) {
    const apiErr = findApiCallError(err);
    return {
      ok: false,
      provider: resolved.provider,
      model: resolved.model,
      toolCount,
      error: formatLlmProviderError(err, providerConfig),
      statusCode: apiErr?.statusCode ?? null,
      responseBody: apiErr?.responseBody?.slice(0, 2_000) ?? null,
      skippedTools: skippedTools.length > 0 ? skippedTools : undefined,
    };
  }
}
