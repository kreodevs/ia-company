import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { generateText } from "ai";
import { createLanguageModel, providerConfigFromResolved } from "../core/providers.js";
import { extractHandoffFromAgentOutput } from "./product-consensus.js";
import { ensureProductWorkspace } from "./product-workspace.js";
import { prisma } from "./prisma.js";
import { resolveChatLlmConfig } from "./tenant-llm.js";
import type { TenantLlmOverrides } from "./tenant-llm.js";
import type { SharedMemory } from "../types/index.js";

const SUMMARY_MAX_SOURCE_CHARS = 12_000;
const SUMMARY_MAX_TOTAL_INPUT = 80_000;

export interface RunSummarySource {
  agentName: string;
  stepOrder: number;
  content: string;
}

function readMemoryString(memory: SharedMemory, key: string): string | null {
  const value = memory[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function collectRunSummarySources(memory: SharedMemory): RunSummarySource[] {
  const history = Array.isArray(memory._history) ? memory._history : [];
  const sources: RunSummarySource[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < history.length; i++) {
    const step = history[i]!;
    const raw = typeof step.output === "string" ? step.output : "";
    if (!raw.trim()) continue;

    const stepOrder = step.stepOrder ?? i + 1;
    const handoff = extractHandoffFromAgentOutput(raw, step.agentName, stepOrder);
    const content = handoff.content.trim();
    if (!content) continue;

    const key = `${step.agentName}:${stepOrder}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ agentName: step.agentName, stepOrder, content });
  }

  return sources.sort((a, b) => a.stepOrder - b.stepOrder);
}

export function buildRunSummaryPrompt(input: {
  workflowName: string;
  request: string;
  productName?: string | null;
  sources: RunSummarySource[];
}): string {
  const sections: string[] = [];
  let totalChars = 0;

  for (const source of input.sources) {
    let content = source.content;
    if (content.length > SUMMARY_MAX_SOURCE_CHARS) {
      content = `${content.slice(0, SUMMARY_MAX_SOURCE_CHARS)}\n\n… (truncated)`;
    }
    const block = `### ${source.agentName.replace(/-/g, " ")} (step ${source.stepOrder})\n\n${content}`;
    if (totalChars + block.length > SUMMARY_MAX_TOTAL_INPUT) break;
    sections.push(block);
    totalChars += block.length;
  }

  const scope = input.productName
    ? `Product: **${input.productName}**`
    : "Scope: company-wide exploration (no single product).";

  return `Workflow: **${input.workflowName}**
${scope}

Original request:
${input.request.trim() || "(not specified)"}

Team deliverables (one section per agent step):
${sections.join("\n\n---\n\n")}

Write a consolidated executive summary in markdown for the human who ordered this work.`;
}

export async function generateAndPersistRunSummary(input: {
  runId: string;
  tenantId: string;
  workflowName: string;
  sharedMemory: SharedMemory;
  productSlug?: string;
  productName?: string | null;
  tenantLlm: TenantLlmOverrides | null;
}): Promise<string> {
  const existing = readMemoryString(input.sharedMemory, "runSummary");
  if (existing) return existing;

  const sources = collectRunSummarySources(input.sharedMemory);
  if (sources.length === 0) return "";

  const request =
    readMemoryString(input.sharedMemory, "officeRequest") ??
    readMemoryString(input.sharedMemory, "task") ??
    readMemoryString(input.sharedMemory, "nextAction") ??
    "";

  const resolved = resolveChatLlmConfig(input.tenantLlm, { temperature: 0.3 });
  const languageModel = createLanguageModel(providerConfigFromResolved(resolved));

  const result = await generateText({
    model: languageModel,
    temperature: 0.3,
    system: `You synthesize multi-agent workflow outputs into one clear deliverable for a business owner.

Rules:
- Write in the same language as the original request (Spanish if the request is in Spanish).
- Structure: title, context (1 short paragraph), key findings (bullets), recommendations / next steps, optional risks.
- Merge overlapping points across agents — do not repeat the same idea twice.
- Be concrete and actionable; no meta-commentary about agents or tools.
- Do not include JSON handoff blocks or internal system fields.
- Target 400–900 words unless the source material is very thin.`,
    prompt: buildRunSummaryPrompt({
      workflowName: input.workflowName,
      request,
      productName: input.productName,
      sources,
    }),
    maxSteps: 1,
  });

  const summary = result.text.trim();
  if (!summary) return "";

  const updatedMemory: SharedMemory = {
    ...input.sharedMemory,
    runSummary: summary,
    runSummaryGeneratedAt: new Date().toISOString(),
  };

  await prisma.executionRun.update({
    where: { id: input.runId },
    data: { sharedMemory: updatedMemory as object },
  });

  if (input.productSlug) {
    try {
      const root = await ensureProductWorkspace(input.productSlug);
      const relPath = join("docs", "coordinator", `run-summary-${input.runId.slice(0, 8)}.md`);
      const absPath = join(root, relPath);
      await mkdir(dirname(absPath), { recursive: true });
      await writeFile(absPath, summary, "utf-8");
    } catch {
      // Non-fatal: summary still lives in run memory
    }
  }

  return summary;
}

export function readRunSummary(memory: SharedMemory): string {
  return readMemoryString(memory, "runSummary") ?? "";
}
