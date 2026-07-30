import type { ResolvedAgentLlmConfig } from "../lib/tenant-llm.js";
import { getPlatformSettingsSync } from "../lib/platform-settings.js";

const REPLICATE_API = "https://api.replicate.com/v1";
const POLL_INTERVAL_MS = 1_500;
const MAX_POLL_MS = 120_000;

interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: string | null;
}

function replicateApiKey(): string {
  const key = getPlatformSettingsSync().providers.replicate.apiKey;
  if (!key) {
    throw new Error(
      'Missing API key for provider "replicate". Configure it in Admin → Platform settings.',
    );
  }
  return key;
}

function modelPath(model: string): string {
  const trimmed = model.trim().replace(/^\/+/, "");
  if (trimmed.includes("/")) return trimmed;
  throw new Error(`Replicate model must use owner/name format (got "${model}")`);
}

async function createPrediction(
  model: string,
  input: Record<string, unknown>,
): Promise<ReplicatePrediction> {
  const apiKey = replicateApiKey();
  const res = await fetch(`${REPLICATE_API}/models/${modelPath(model)}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({ input }),
  });

  const body = (await res.json()) as ReplicatePrediction & { detail?: string };
  if (!res.ok) {
    throw new Error(body.detail ?? body.error ?? `Replicate request failed (${res.status})`);
  }
  if (body.status === "failed") {
    throw new Error(body.error ?? "Replicate prediction failed");
  }
  if (body.status === "succeeded") return body;
  return waitForPrediction(body.id);
}

async function waitForPrediction(id: string): Promise<ReplicatePrediction> {
  const apiKey = replicateApiKey();
  const started = Date.now();

  while (Date.now() - started < MAX_POLL_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const res = await fetch(`${REPLICATE_API}/predictions/${id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const body = (await res.json()) as ReplicatePrediction & { detail?: string };
    if (!res.ok) {
      throw new Error(body.detail ?? `Replicate poll failed (${res.status})`);
    }
    if (body.status === "succeeded") return body;
    if (body.status === "failed" || body.status === "canceled") {
      throw new Error(body.error ?? `Replicate prediction ${body.status}`);
    }
  }

  throw new Error(`Replicate prediction timed out after ${MAX_POLL_MS / 1000}s`);
}

function flattenOutput(output: unknown): string {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    return output.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join("\n");
  }
  if (output && typeof output === "object") {
    return JSON.stringify(output, null, 2);
  }
  return String(output ?? "");
}

function extractMediaUrl(output: unknown): string {
  if (typeof output === "string" && output.startsWith("http")) return output;
  if (Array.isArray(output)) {
    const first = output.find((item) => typeof item === "string" && item.startsWith("http"));
    if (typeof first === "string") return first;
  }
  const flat = flattenOutput(output);
  const match = flat.match(/https?:\/\/[^\s"'<>]+/);
  if (match) return match[0];
  throw new Error("Replicate returned no media URL in output");
}

export async function runReplicateChat(
  config: Pick<ResolvedAgentLlmConfig, "model" | "temperature">,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const prompt = [systemPrompt.trim(), userPrompt.trim()].filter(Boolean).join("\n\n");
  const prediction = await createPrediction(config.model, {
    prompt,
    max_tokens: 2048,
    temperature: config.temperature,
  });
  const text = flattenOutput(prediction.output);
  const approxTokens = Math.ceil(text.length / 4);
  return {
    text,
    promptTokens: Math.ceil(prompt.length / 4),
    completionTokens: approxTokens,
  };
}

export async function runReplicateMedia(
  config: Pick<ResolvedAgentLlmConfig, "model" | "temperature" | "modelKind">,
  prompt: string,
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const input: Record<string, unknown> = { prompt: prompt.trim() };
  if (config.modelKind === "image") {
    input.num_outputs = 1;
  }

  const prediction = await createPrediction(config.model, input);
  const url = extractMediaUrl(prediction.output);

  const text =
    config.modelKind === "image"
      ? `![Generated image](${url})\n\n**Source:** ${url}`
      : `[Generated audio](${url})\n\n**Source:** ${url}`;

  return {
    text,
    promptTokens: Math.ceil(prompt.length / 4),
    completionTokens: 0,
  };
}

export async function runReplicateStep(
  config: ResolvedAgentLlmConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  if (config.modelKind === "image" || config.modelKind === "audio") {
    const combined = [systemPrompt.trim(), userPrompt.trim()].filter(Boolean).join("\n\n");
    return runReplicateMedia(config, combined);
  }
  return runReplicateChat(config, systemPrompt, userPrompt);
}

export interface ReplicateModelOption {
  id: string;
  name: string;
  description: string | null;
}

export async function listReplicateModels(query?: string): Promise<ReplicateModelOption[]> {
  const apiKey = replicateApiKey();
  const q = (query ?? "").trim();
  const url = q
    ? `${REPLICATE_API}/models?search=${encodeURIComponent(q)}`
    : `${REPLICATE_API}/models`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) {
    throw new Error(`Replicate models request failed (${res.status})`);
  }

  const body = (await res.json()) as {
    results?: Array<{ owner: string; name: string; description?: string | null }>;
  };

  return (body.results ?? [])
    .map((model) => ({
      id: `${model.owner}/${model.name}`,
      name: `${model.owner}/${model.name}`,
      description: model.description ?? null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
