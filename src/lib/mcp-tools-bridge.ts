import { tool } from "ai";
import { z } from "zod";
import type { ToolExecutionContext } from "../types/index.js";
import { callTenantMcpTool, loadAgentMcpToolDefinitions } from "./mcp-registry.js";

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

function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodObject<z.ZodRawShape> {
  const props = schema.properties as Record<string, Record<string, unknown>> | undefined;
  if (!props || typeof props !== "object") {
    return z.object({}).passthrough();
  }

  const required = new Set(
    Array.isArray(schema.required) ? schema.required.map(String) : [],
  );
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, prop] of Object.entries(props)) {
    const desc = typeof prop.description === "string" ? prop.description : key;
    let field: z.ZodTypeAny = z.any().describe(desc);
    if (prop.type === "string") field = z.string().describe(desc);
    else if (prop.type === "number" || prop.type === "integer") field = z.number().describe(desc);
    else if (prop.type === "boolean") field = z.boolean().describe(desc);
    else if (prop.type === "array") field = z.array(z.any()).describe(desc);
    else if (prop.type === "object") field = z.record(z.any()).describe(desc);

    if (!required.has(key)) field = field.optional();
    shape[key] = field;
  }

  return z.object(shape).passthrough();
}

function mcpToolKey(serverSlug: string, toolName: string): string {
  const safe = `${serverSlug}__${toolName}`.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 60);
  return `mcp_${safe}`;
}

export async function buildMcpToolsForAgent(
  ctx: ToolExecutionContext & { agentId?: string },
): Promise<Record<string, unknown>> {
  if (!ctx.tenantId || !ctx.agentId || ctx.toolMode === "readonly") return {};

  const defs = await loadAgentMcpToolDefinitions(ctx.tenantId, ctx.agentId);
  if (defs.length === 0) return {};

  const limits = new Map<string, number>();
  for (const def of defs) limits.set(def.serverId, def.maxCallsPerRun);
  const budget = new McpCallBudget(limits);

  const tools: Record<string, unknown> = {};

  for (const def of defs) {
    if (!def.command) continue;

    let schema: z.ZodObject<z.ZodRawShape>;
    try {
      schema = jsonSchemaToZod(JSON.parse(def.inputSchemaJson) as Record<string, unknown>);
    } catch {
      schema = z.object({}).passthrough();
    }

    const toolKey = mcpToolKey(def.serverSlug, def.toolName);
    const description =
      def.description?.trim() ||
      `MCP tool ${def.toolName} from server ${def.serverName}`;

    tools[toolKey] = tool({
      description: `[MCP:${def.serverSlug}] ${description}`,
      parameters: schema,
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
  }

  return tools;
}
