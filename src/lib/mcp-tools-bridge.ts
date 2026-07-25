import { tool, jsonSchema } from "ai";
import type { ToolExecutionContext } from "../types/index.js";
import { callTenantMcpTool, loadAgentMcpToolDefinitions } from "./mcp-registry.js";
import {
  buildMcpToolKey,
  MAX_MCP_TOOLS_PER_AGENT,
  parseMcpInputSchemaJson,
  sanitizeMcpToolDescription,
} from "./mcp-tool-schema.js";

class McpCallBudget {
  private counts = new Map<string, number>();

  constructor(private readonly limits: Map<string, number>) {}

  consume(serverId: string): void {
    const max = this.limits.get(serverId) ?? 30;
    const used = this.counts.get(serverId) ?? 0;
    if (used >= max) {
      throw new Error(`MCP call limit reached for this run (${max} calls)`);
    }
    this.counts.set(serverId, used + 1);
  }
}

export async function buildMcpToolsForAgent(
  ctx: ToolExecutionContext & { agentId?: string },
): Promise<Record<string, unknown>> {
  if (!ctx.tenantId || !ctx.agentId || ctx.toolMode === "readonly") return {};

  const defs = (await loadAgentMcpToolDefinitions(ctx.tenantId, ctx.agentId)).slice(
    0,
    MAX_MCP_TOOLS_PER_AGENT,
  );
  if (defs.length === 0) return {};

  const limits = new Map<string, number>();
  for (const def of defs) limits.set(def.serverId, def.maxCallsPerRun);
  const budget = new McpCallBudget(limits);

  const tools: Record<string, unknown> = {};
  const usedKeys = new Set<string>();

  for (const def of defs) {
    if (!def.command) continue;

    let toolKey = buildMcpToolKey(def.serverSlug, def.toolName);
    if (usedKeys.has(toolKey)) {
      toolKey = `${toolKey}_${usedKeys.size}`;
    }
    usedKeys.add(toolKey);

    try {
      const schema = parseMcpInputSchemaJson(def.inputSchemaJson);
      const description =
        sanitizeMcpToolDescription(def.description) ||
        `MCP tool ${def.toolName} from server ${def.serverName}`;

      tools[toolKey] = tool({
        description: `[MCP:${def.serverSlug}] ${description}`,
        parameters: jsonSchema(schema),
        execute: async (args) => {
          budget.consume(def.serverId);
          ctx.onLog?.(`mcp: ${def.serverSlug}/${def.toolName}`, { args });
          const result = await callTenantMcpTool({
            command: def.command,
            argsJson: def.argsJson,
            envJson: def.envJson,
            toolName: def.toolName,
            args: args as Record<string, unknown>,
          });
          return result;
        },
      });
    } catch (err) {
      ctx.onLog?.(`mcp: skipped tool ${def.serverSlug}/${def.toolName}`, {
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return tools;
}
