import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { GenerateTextResult, ToolSet } from "ai";
import { agentDocsPath } from "./workspace-layout.js";

function slugifySegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function agentWroteDocsInStep<TOOLS extends ToolSet>(
  response: GenerateTextResult<TOOLS, unknown>,
): boolean {
  for (const step of response.steps ?? []) {
    for (const toolResult of step.toolResults ?? []) {
      if (toolResult.toolName !== "write_file") continue;
      const result = toolResult.result as { path?: string } | undefined;
      const path = typeof result?.path === "string" ? result.path : "";
      if (path.startsWith("docs/")) return true;
    }
  }
  return false;
}

export function collectAgentStepOutput<TOOLS extends ToolSet>(
  response: GenerateTextResult<TOOLS, unknown>,
): string {
  const chunks: string[] = [];
  const seen = new Set<string>();

  const push = (text: string | undefined) => {
    const trimmed = text?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    chunks.push(trimmed);
  };

  push(response.text);
  for (const step of response.steps ?? []) {
    push(step.text);
  }

  return chunks.join("\n\n");
}

export async function persistAgentDeliverableIfMissing<TOOLS extends ToolSet>(input: {
  workspaceRoot: string;
  agentName: string;
  workflowName: string;
  runId: string;
  output: string;
  response: GenerateTextResult<TOOLS, unknown>;
}): Promise<string | null> {
  const output = input.output.trim();
  if (!output) return null;
  if (agentWroteDocsInStep(input.response)) return null;

  const docsDir = agentDocsPath(input.agentName);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const workflowSlug = slugifySegment(input.workflowName) || "workflow";
  const relativePath = join(docsDir, `${stamp}-${workflowSlug}.md`);
  const fullPath = join(input.workspaceRoot, relativePath);

  const header = `# ${input.agentName} — ${input.workflowName}\n\n- Run: \`${input.runId}\`\n- Generated: ${new Date().toISOString()}\n\n---\n\n`;
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${header}${output}\n`, "utf-8");
  return relativePath.replace(/\\/g, "/");
}
