import {
  CATALOG_STUDIO_MAX_TOKENS_PROPOSE,
  generateCatalogJson,
} from "./catalog-studio-llm.js";
import { CATALOG_STUDIO_LLM_RULES } from "./catalog-studio-fewshots.js";
import { slugifyCatalogName } from "./tenant-catalog.js";

export interface OfficeAgentPick {
  agentNames: string[];
  missingRoles: Array<{ name: string; suggestedBrief: string }>;
  summary?: string;
}

export async function selectOfficeAgentsWithLlm(
  tenantId: string,
  request: string,
  catalog: Array<{ name: string; role: string }>,
  options: { preferredNames?: string[]; maxAgents?: number } = {},
): Promise<OfficeAgentPick | null> {
  if (request.trim().length < 8 || catalog.length === 0) return null;

  const maxAgents = options.maxAgents ?? 5;
  const preferred = options.preferredNames ?? [];

  try {
    const parsed = await generateCatalogJson(
      tenantId,
      [
        ...CATALOG_STUDIO_LLM_RULES,
        "Task: pick agents from the TENANT catalog for an office task.",
        "Use ONLY agent names from the catalog when they exist.",
        "missingRoles: roles needed but absent from catalog (kebab-case name + brief to create).",
        `Return ONLY JSON: { "agentNames": ["kebab-name"], "missingRoles": [{ "name", "suggestedBrief" }], "summary": "one line" }`,
        `Pick at most ${maxAgents} agents.`,
      ].join("\n"),
      [
        `Task: ${request}`,
        preferred.length ? `Preferred dept agents: ${preferred.join(", ")}` : "",
        `Tenant catalog: ${catalog.map((a) => `${a.name} (${a.role})`).join("; ")}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      CATALOG_STUDIO_MAX_TOKENS_PROPOSE,
      0.35,
    );

    if (!parsed) return null;

    const catalogNames = new Set(catalog.map((a) => a.name));
    const agentNames = Array.isArray(parsed.agentNames)
      ? parsed.agentNames
          .filter((n): n is string => typeof n === "string")
          .map(slugifyCatalogName)
          .filter((n) => catalogNames.has(n))
      : [];

    const missingRoles: OfficeAgentPick["missingRoles"] = [];
    if (Array.isArray(parsed.missingRoles)) {
      for (const item of parsed.missingRoles) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const name = typeof o.name === "string" ? slugifyCatalogName(o.name) : "";
        const suggestedBrief =
          typeof o.suggestedBrief === "string" ? o.suggestedBrief.trim() : "";
        if (name && suggestedBrief && !catalogNames.has(name)) {
          missingRoles.push({ name, suggestedBrief });
        }
      }
    }

    if (!agentNames.length && !missingRoles.length) return null;

    return {
      agentNames,
      missingRoles,
      summary: typeof parsed.summary === "string" ? parsed.summary : undefined,
    };
  } catch {
    return null;
  }
}
