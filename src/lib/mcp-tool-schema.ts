import { createHash } from "node:crypto";

export const MAX_MCP_TOOL_DESCRIPTION_CHARS = 1_024;
export const MAX_MCP_TOOL_PROPERTIES = 48;
export const MAX_MCP_TOOLS_PER_AGENT = 24;

const COMBINER_KEYS = ["oneOf", "anyOf", "allOf"] as const;

function truncateText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}…`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeLeafSchema(node: Record<string, unknown>): Record<string, unknown> {
  const type = typeof node.type === "string" ? node.type : "string";
  const allowed = new Set(["string", "number", "integer", "boolean"]);
  const out: Record<string, unknown> = {
    type: allowed.has(type) ? type : "string",
  };

  if (typeof node.description === "string" && node.description.trim()) {
    out.description = truncateText(node.description.trim(), MAX_MCP_TOOL_DESCRIPTION_CHARS);
  }
  if (Array.isArray(node.enum) && node.enum.length > 0) {
    out.enum = node.enum.slice(0, 32);
  }

  return out;
}

function sanitizeArraySchema(node: Record<string, unknown>): Record<string, unknown> {
  const items = node.items;
  const out: Record<string, unknown> = {
    type: "array",
    items:
      isPlainObject(items) && !Array.isArray(items)
        ? sanitizeSchemaNode(items, false)
        : { type: "string" },
  };

  if (typeof node.description === "string" && node.description.trim()) {
    out.description = truncateText(node.description.trim(), MAX_MCP_TOOL_DESCRIPTION_CHARS);
  }

  return out;
}

function sanitizeSchemaNode(node: Record<string, unknown>, isRoot: boolean): Record<string, unknown> {
  if (typeof node.$ref === "string") {
    return { type: "string", description: "Referenced value (schema ref collapsed for LLM compatibility)" };
  }

  for (const key of COMBINER_KEYS) {
    const options = node[key];
    if (Array.isArray(options)) {
      const objectBranch = options.find((entry) => isPlainObject(entry));
      if (objectBranch) return sanitizeSchemaNode(objectBranch, isRoot);
    }
  }

  const nodeType = typeof node.type === "string" ? node.type : isRoot ? "object" : undefined;
  if (nodeType === "array") return sanitizeArraySchema(node);
  if (nodeType && nodeType !== "object") return sanitizeLeafSchema(node);

  const propertiesRaw = node.properties;
  const sanitizedProps: Record<string, unknown> = {};

  if (isPlainObject(propertiesRaw)) {
    for (const [key, prop] of Object.entries(propertiesRaw).slice(0, MAX_MCP_TOOL_PROPERTIES)) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) continue;
      sanitizedProps[key] = isPlainObject(prop)
        ? sanitizeSchemaNode(prop, false)
        : { type: "string" };
    }
  }

  const out: Record<string, unknown> = {
    type: "object",
    properties: sanitizedProps,
    additionalProperties: false,
  };

  if (Array.isArray(node.required)) {
    const allowed = new Set(Object.keys(sanitizedProps));
    const required = node.required.map(String).filter((key) => allowed.has(key));
    if (required.length > 0) out.required = required;
  }

  return out;
}

/** Normalize MCP JSON Schema for OpenAI-compatible tool calling (OpenRouter/Gemini). */
export function sanitizeMcpInputSchema(raw: unknown): Record<string, unknown> {
  if (!isPlainObject(raw)) {
    return { type: "object", properties: {}, additionalProperties: false };
  }
  return sanitizeSchemaNode(raw, true);
}

export function parseMcpInputSchemaJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw?.trim()) {
    return sanitizeMcpInputSchema({});
  }
  try {
    return sanitizeMcpInputSchema(JSON.parse(raw) as unknown);
  } catch {
    return sanitizeMcpInputSchema({});
  }
}

export function sanitizeMcpToolDescription(description: string | null | undefined): string {
  const trimmed = description?.trim();
  if (!trimmed) return "MCP tool";
  return truncateText(trimmed, MAX_MCP_TOOL_DESCRIPTION_CHARS);
}

export function buildMcpToolKey(serverSlug: string, toolName: string): string {
  const safe = `${serverSlug}__${toolName}`.replace(/[^a-zA-Z0-9_]/g, "_");
  if (safe.length <= 56) return `mcp_${safe}`;
  const hash = createHash("sha1").update(`${serverSlug}:${toolName}`).digest("hex").slice(0, 8);
  return `mcp_${safe.slice(0, 48)}_${hash}`;
}

export function validateMcpInputSchema(raw: unknown): { ok: true } | { ok: false; reason: string } {
  const schema = sanitizeMcpInputSchema(raw);
  if (schema.type !== "object") return { ok: false, reason: "Root schema must be an object" };
  if (!isPlainObject(schema.properties)) return { ok: false, reason: "Missing properties object" };
  return { ok: true };
}
