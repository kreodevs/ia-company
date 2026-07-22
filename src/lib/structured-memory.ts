import type { SharedMemory } from "../types/index.js";

const AGENT_OUTPUT_KEYS = [
  "cfo-campbell",
  "critic-munger",
  "ceo-bezos",
  "research-thompson",
  "product-norman",
  "cto-vogels",
  "fullstack-dhh",
  "qa-bach",
  "devops-hightower",
  "marketing-godin",
  "operations-pg",
  "sales-ross",
  "interaction-cooper",
  "ui-duarte",
] as const;

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());
}

function tryParseJsonValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function collectJsonObjects(text: string): Record<string, unknown>[] {
  const objects: Record<string, unknown>[] = [];

  for (const match of text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    const parsed = tryParseJsonValue(match[1].trim());
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      objects.push(parsed as Record<string, unknown>);
    }
  }

  for (const match of text.matchAll(/\{[\s\S]*?\}/g)) {
    const parsed = tryParseJsonValue(match[0]);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      objects.push(parsed as Record<string, unknown>);
    }
  }

  return objects;
}

export function extractTopIdeasFromText(text: string): string[] {
  for (const obj of collectJsonObjects(text)) {
    const ideas = asStringArray(obj.topIdeas);
    if (ideas.length > 0) return ideas.slice(0, 3);
  }

  const inlineMatch = text.match(/"topIdeas"\s*:\s*(\[[\s\S]*?\])/i);
  if (inlineMatch) {
    const ideas = asStringArray(tryParseJsonValue(inlineMatch[1]));
    if (ideas.length > 0) return ideas.slice(0, 3);
  }

  const sectionMatch = text.match(
    /##\s*(?:Top Ideas|Ideas principales|topIdeas|Ideas)[^\n]*\n([\s\S]*?)(?:\n##|\n```|$)/i,
  );
  if (sectionMatch) {
    const lines = sectionMatch[1]
      .split("\n")
      .map((line) => line.replace(/^[\s\-*•\d.)]+/, "").trim())
      .filter((line) => line.length > 2 && line.length < 140);
    if (lines.length > 0) return lines.slice(0, 3);
  }

  return [];
}

export function extractGoNoGoFromText(text: string): string | undefined {
  for (const obj of collectJsonObjects(text)) {
    const value = asString(obj.goNoGo);
    if (value) return value;
  }

  const inlineMatch = text.match(/"goNoGo"\s*:\s*"([^"]+)"/i);
  if (inlineMatch) return inlineMatch[1];

  if (/\bNO-GO\b|\bNO_GO\b|\bNOGO\b/i.test(text)) return "NO-GO";
  if (/\bGO\b/.test(text) && /\b(go\/no-go|decision|rationale|evaluat)/i.test(text)) return "GO";

  return undefined;
}

function pickStringField(text: string, field: string): string | undefined {
  for (const obj of collectJsonObjects(text)) {
    const value = asString(obj[field]);
    if (value) return value;
  }

  const inlineMatch = text.match(new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`, "i"));
  return inlineMatch?.[1]?.trim();
}

function agentOutputTexts(memory: SharedMemory): string[] {
  const texts: string[] = [];
  for (const key of AGENT_OUTPUT_KEYS) {
    const value = asString(memory[key]);
    if (value) texts.push(value);
  }
  for (const [key, value] of Object.entries(memory)) {
    if (key.startsWith("_") || typeof value !== "string") continue;
    if (AGENT_OUTPUT_KEYS.includes(key as (typeof AGENT_OUTPUT_KEYS)[number])) continue;
    if (value.trim()) texts.push(value.trim());
  }
  return texts;
}

export function enrichSharedMemoryFromAgentOutputs(memory: SharedMemory): SharedMemory {
  const enriched: SharedMemory = { ...memory };
  const texts = agentOutputTexts(memory);

  if (asStringArray(enriched.topIdeas).length === 0) {
    for (const text of texts) {
      const ideas = extractTopIdeasFromText(text);
      if (ideas.length > 0) {
        enriched.topIdeas = ideas;
        break;
      }
    }
  }

  if (!asString(enriched.goNoGo)) {
    for (const text of texts) {
      const decision = extractGoNoGoFromText(text);
      if (decision) {
        enriched.goNoGo = decision;
        break;
      }
    }
  }

  for (const text of texts) {
    if (!asString(enriched.productName)) {
      const name = pickStringField(text, "productName");
      if (name) enriched.productName = name;
    }
    if (!asString(enriched.productSlug)) {
      const slug = pickStringField(text, "productSlug");
      if (slug) enriched.productSlug = slug;
    }
    if (!asString(enriched.productDescription)) {
      const description = pickStringField(text, "productDescription");
      if (description) enriched.productDescription = description;
    }
  }

  return enriched;
}
