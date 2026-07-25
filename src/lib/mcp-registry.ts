import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { prisma } from "./prisma.js";
import { decryptSecret, encryptSecret } from "./crypto.js";
import { sanitizeMcpInputSchema } from "./mcp-tool-schema.js";

const MCP_CONNECT_TIMEOUT_MS = 15_000;
const MCP_CALL_TIMEOUT_MS = 30_000;

const MUTATING_TOOL_PATTERN =
  /^(create|update|delete|remove|write|post|put|patch|send|drop|insert|destroy)/i;

export interface McpServerRecord {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  transport: "stdio" | "sse";
  command: string | null;
  argsJson: string | null;
  url: string | null;
  envJson: string | null;
  enabled: boolean;
  readOnly: boolean;
  maxCallsPerRun: number;
  lastSyncedAt: Date | null;
  tools: Array<{
    id: string;
    name: string;
    description: string | null;
    inputSchemaJson: string;
    enabled: boolean;
  }>;
  grants: Array<{ agentId: string; allowedToolNames: string | null }>;
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function parseJsonArray(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function safeProcessEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function parseEnvJson(raw: string | null): Record<string, string> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!key.trim()) continue;
      out[key] = decryptSecret(String(value)) ?? String(value);
    }
    return out;
  } catch {
    return {};
  }
}

export function encryptEnvJson(env: Record<string, string>): string {
  const encrypted: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (!key.trim() || !value.trim()) continue;
    encrypted[key.trim()] = encryptSecret(value.trim());
  }
  return JSON.stringify(encrypted);
}

export async function listTenantMcpServers(tenantId: string) {
  return prisma.tenantMcpServer.findMany({
    where: { tenantId },
    include: {
      tools: { orderBy: { name: "asc" } },
      grants: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getTenantMcpServer(tenantId: string, serverId: string) {
  return prisma.tenantMcpServer.findFirst({
    where: { id: serverId, tenantId },
    include: { tools: { orderBy: { name: "asc" } }, grants: true },
  });
}

export async function createTenantMcpServer(
  tenantId: string,
  input: {
    name: string;
    slug?: string;
    description?: string | null;
    command: string;
    argsJson?: string[];
    env?: Record<string, string>;
    readOnly?: boolean;
    maxCallsPerRun?: number;
    enabled?: boolean;
    agentIds?: string[];
  },
) {
  const slug = slugify(input.slug ?? input.name);
  if (!slug) throw new Error("Invalid MCP server slug");

  const existing = await prisma.tenantMcpServer.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
  });
  if (existing) throw new Error(`MCP server slug already exists: ${slug}`);

  const server = await prisma.tenantMcpServer.create({
    data: {
      tenantId,
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      transport: "stdio",
      command: input.command.trim(),
      argsJson: JSON.stringify(input.argsJson ?? []),
      envJson: input.env ? encryptEnvJson(input.env) : null,
      readOnly: input.readOnly ?? true,
      maxCallsPerRun: input.maxCallsPerRun ?? 30,
      enabled: input.enabled ?? true,
    },
  });

  if (input.agentIds?.length) {
    await prisma.agentMcpGrant.createMany({
      data: input.agentIds.map((agentId) => ({ agentId, serverId: server.id })),
      skipDuplicates: true,
    });
  }

  await syncTenantMcpServerTools(tenantId, server.id);
  return getTenantMcpServer(tenantId, server.id);
}

export async function updateTenantMcpServer(
  tenantId: string,
  serverId: string,
  input: {
    name?: string;
    description?: string | null;
    command?: string;
    argsJson?: string[];
    env?: Record<string, string>;
    readOnly?: boolean;
    maxCallsPerRun?: number;
    enabled?: boolean;
    agentIds?: string[];
  },
) {
  const existing = await getTenantMcpServer(tenantId, serverId);
  if (!existing) throw new Error("MCP server not found");

  await prisma.tenantMcpServer.update({
    where: { id: serverId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.command !== undefined ? { command: input.command.trim() } : {}),
      ...(input.argsJson !== undefined ? { argsJson: JSON.stringify(input.argsJson) } : {}),
      ...(input.env !== undefined ? { envJson: encryptEnvJson(input.env) } : {}),
      ...(input.readOnly !== undefined ? { readOnly: input.readOnly } : {}),
      ...(input.maxCallsPerRun !== undefined ? { maxCallsPerRun: input.maxCallsPerRun } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    },
  });

  if (input.agentIds !== undefined) {
    await prisma.agentMcpGrant.deleteMany({ where: { serverId } });
    if (input.agentIds.length > 0) {
      const agents = await prisma.agent.findMany({
        where: { tenantId, id: { in: input.agentIds } },
        select: { id: true },
      });
      await prisma.agentMcpGrant.createMany({
        data: agents.map((a) => ({ agentId: a.id, serverId })),
      });
    }
  }

  if (input.command !== undefined || input.argsJson !== undefined || input.env !== undefined) {
    await syncTenantMcpServerTools(tenantId, serverId);
  }

  return getTenantMcpServer(tenantId, serverId);
}

export async function deleteTenantMcpServer(tenantId: string, serverId: string) {
  const existing = await getTenantMcpServer(tenantId, serverId);
  if (!existing) throw new Error("MCP server not found");
  await prisma.tenantMcpServer.delete({ where: { id: serverId } });
}

export async function syncTenantMcpServerTools(tenantId: string, serverId: string) {
  const server = await getTenantMcpServer(tenantId, serverId);
  if (!server) throw new Error("MCP server not found");
  if (!server.command) throw new Error("MCP server command is required for stdio transport");

  const tools = await listMcpToolsFromServer(server);
  await prisma.tenantMcpTool.deleteMany({ where: { serverId } });
  if (tools.length > 0) {
    await prisma.tenantMcpTool.createMany({
      data: tools.map((tool) => ({
        serverId,
        name: tool.name,
        description: tool.description ?? null,
        inputSchemaJson: JSON.stringify(sanitizeMcpInputSchema(tool.inputSchema ?? {})),
        enabled: true,
      })),
    });
  }

  await prisma.tenantMcpServer.update({
    where: { id: serverId },
    data: { lastSyncedAt: new Date() },
  });

  return getTenantMcpServer(tenantId, serverId);
}

async function listMcpToolsFromServer(server: McpServerRecord) {
  const client = new Client({ name: "auto-company-sync", version: "2.0.0" });
  const transport = new StdioClientTransport({
    command: server.command!,
    args: parseJsonArray(server.argsJson),
    env: { ...safeProcessEnv(), ...parseEnvJson(server.envJson) },
    stderr: "pipe",
  });

  const timer = setTimeout(() => transport.close(), MCP_CONNECT_TIMEOUT_MS);
  try {
    await client.connect(transport);
    const listed = await client.listTools();
    return listed.tools ?? [];
  } finally {
    clearTimeout(timer);
    await client.close().catch(() => undefined);
  }
}

export async function loadAgentMcpToolDefinitions(tenantId: string, agentId: string) {
  const grants = await prisma.agentMcpGrant.findMany({
    where: { agentId, server: { tenantId, enabled: true } },
    include: {
      server: {
        include: { tools: { where: { enabled: true }, orderBy: { name: "asc" } } },
      },
    },
  });

  const defs: Array<{
    serverId: string;
    serverSlug: string;
    serverName: string;
    readOnly: boolean;
    maxCallsPerRun: number;
    command: string;
    argsJson: string | null;
    envJson: string | null;
    toolName: string;
    description: string | null;
    inputSchemaJson: string;
  }> = [];

  for (const grant of grants) {
    const allowed = grant.allowedToolNames
      ? (JSON.parse(grant.allowedToolNames) as string[])
      : null;

    for (const tool of grant.server.tools) {
      if (allowed && !allowed.includes(tool.name)) continue;
      if (grant.server.readOnly && MUTATING_TOOL_PATTERN.test(tool.name)) continue;

      defs.push({
        serverId: grant.server.id,
        serverSlug: grant.server.slug,
        serverName: grant.server.name,
        readOnly: grant.server.readOnly,
        maxCallsPerRun: grant.server.maxCallsPerRun,
        command: grant.server.command ?? "",
        argsJson: grant.server.argsJson,
        envJson: grant.server.envJson,
        toolName: tool.name,
        description: tool.description,
        inputSchemaJson: tool.inputSchemaJson,
      });
    }
  }

  return defs;
}

export async function callTenantMcpTool(input: {
  command: string;
  argsJson: string | null;
  envJson: string | null;
  toolName: string;
  args: Record<string, unknown>;
}): Promise<unknown> {
  const client = new Client({ name: "auto-company-run", version: "2.0.0" });
  const transport = new StdioClientTransport({
    command: input.command,
    args: parseJsonArray(input.argsJson),
    env: { ...safeProcessEnv(), ...parseEnvJson(input.envJson) },
    stderr: "pipe",
  });

  const timer = setTimeout(() => transport.close(), MCP_CALL_TIMEOUT_MS);
  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: input.toolName,
      arguments: input.args,
    });
    return result;
  } finally {
    clearTimeout(timer);
    await client.close().catch(() => undefined);
  }
}
