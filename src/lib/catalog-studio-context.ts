import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { listTenantMcpServers } from "./mcp-registry.js";

const REPO_ROOT =
  process.env.NODE_ENV === "production" ? process.cwd() : resolve(import.meta.dirname, "../..");

const PLATFORM_AGENT_STYLE_SLUGS = ["research-thompson", "devops-hightower", "coordinator-chief"] as const;

const MAX_AGENT_EXAMPLE_CHARS = 3_200;
const MAX_TOOL_DESC_CHARS = 160;

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

function extractRoleFromBody(body: string, fallback: string): string {
  const heading = body.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].replace(/^[^:]+:\s*/, "").trim();
  return fallback;
}

async function loadPlatformAgentExample(slug: string): Promise<{ name: string; role: string; systemPrompt: string } | null> {
  const filePath = join(REPO_ROOT, "claude", "agents", `${slug}.md`);
  try {
    const raw = await readFile(filePath, "utf-8");
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    const body = (match?.[2] ?? raw).trim();
    const name =
      match?.[1]
        ?.split("\n")
        .map((line) => line.trim())
        .find((line) => line.startsWith("name:"))
        ?.slice(5)
        .trim()
        .replace(/^['"]|['"]$/g, "") ?? slug;
    return {
      name,
      role: extractRoleFromBody(body, slug),
      systemPrompt: truncate(body, MAX_AGENT_EXAMPLE_CHARS),
    };
  } catch {
    return null;
  }
}

export async function loadPlatformAgentStyleExamples() {
  const examples = await Promise.all(PLATFORM_AGENT_STYLE_SLUGS.map((slug) => loadPlatformAgentExample(slug)));
  return examples.filter((example): example is NonNullable<typeof example> => Boolean(example));
}

export async function buildTenantMcpCatalogSection(tenantId: string): Promise<string> {
  const servers = await listTenantMcpServers(tenantId);
  if (servers.length === 0) {
    return "Registered MCP servers: (none — agent cannot call external MCP tools until tenant admin registers servers in Settings → MCP).";
  }

  const lines = ["Registered MCP servers and synced tools (design skills and workflows around these):"];
  for (const server of servers) {
    if (!server.enabled) continue;
    const enabledTools = server.tools.filter((tool) => tool.enabled);
    lines.push(
      `\n### ${server.name} (slug: ${server.slug}, id: ${server.id})`,
      server.description?.trim() ? `Description: ${truncate(server.description, 240)}` : "",
      `readOnly: ${server.readOnly}, maxCallsPerRun: ${server.maxCallsPerRun}`,
    );
    if (enabledTools.length === 0) {
      lines.push("Tools: (none synced yet — run Sync tools in Settings → MCP)");
      continue;
    }
    lines.push("Tools:");
    for (const tool of enabledTools) {
      lines.push(
        `- ${tool.name}: ${truncate(tool.description ?? "(no description)", MAX_TOOL_DESC_CHARS)}`,
      );
    }
  }
  return lines.filter(Boolean).join("\n");
}

export function matchMcpServersFromBrief(
  brief: string,
  servers: Array<{ id: string; slug: string; name: string }>,
): string[] {
  const haystack = brief.toLowerCase();
  const matched = servers.filter((server) => {
    const slug = server.slug.toLowerCase();
    const name = server.name.toLowerCase();
    return haystack.includes(slug) || haystack.includes(name.replace(/\s+/g, ""));
  });
  return matched.map((server) => server.id);
}

export async function listTenantMcpServerSummaries(tenantId: string) {
  const servers = await listTenantMcpServers(tenantId);
  return servers
    .filter((server) => server.enabled)
    .map((server) => ({
      id: server.id,
      slug: server.slug,
      name: server.name,
      toolNames: server.tools.filter((tool) => tool.enabled).map((tool) => tool.name),
    }));
}
