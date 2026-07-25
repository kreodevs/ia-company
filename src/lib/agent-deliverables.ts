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

export function shouldSkipHandoffDocPersist(entry: {
  wroteDocs?: boolean;
  savedDeliverablePath?: string;
}): boolean {
  return entry.wroteDocs === true || Boolean(entry.savedDeliverablePath?.trim());
}

function extractMessageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const p = part as { type?: string; text?: string };
      return p.type === "text" && typeof p.text === "string" ? p.text : "";
    })
    .filter(Boolean)
    .join("\n");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function collectToolStepArtifacts<TOOLS extends ToolSet>(
  response: GenerateTextResult<TOOLS, unknown>,
): string {
  const chunks: string[] = [];
  const seen = new Set<string>();

  const push = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    chunks.push(trimmed);
  };

  for (const step of response.steps ?? []) {
    for (const toolResult of step.toolResults ?? []) {
      const name = toolResult.toolName;
      const result = asRecord(toolResult.result);
      const matchedCall = step.toolCalls?.find((tc) => tc.toolCallId === toolResult.toolCallId);
      const args = asRecord(matchedCall?.args);

      if (name === "write_file") {
        const path = String(result?.path ?? args?.path ?? "");
        const content = typeof args?.content === "string" ? args.content : "";
        if (content && path) push(`## Written: ${path}\n\n${content}`);
        else if (path) push(`- Wrote file: \`${path}\``);
      }

      if (name === "read_file") {
        const path = String(result?.path ?? args?.path ?? "");
        const content = typeof result?.content === "string" ? result.content : "";
        if (content && path) push(`## Read: ${path}\n\n${content.slice(0, 8000)}`);
        else if (path) push(`- Read file: \`${path}\``);
      }

      if (name === "list_dir" && result) {
        const path = String(result.path ?? ".");
        const entries = Array.isArray(result.entries) ? result.entries : [];
        const names = entries
          .slice(0, 40)
          .map((entry) => asRecord(entry)?.name)
          .filter((n): n is string => typeof n === "string");
        push(`- Listed \`${path}\`: ${names.length ? names.join(", ") : "(empty)"}`);
      }

      if (name === "run_shell_command" && result) {
        const stdout = typeof result.stdout === "string" ? result.stdout.slice(0, 4000) : "";
        if (stdout) push(`## Shell output\n\n\`\`\`\n${stdout}\n\`\`\``);
      }
    }

    for (const toolCall of step.toolCalls ?? []) {
      if (toolCall.toolName !== "write_file") continue;
      const args = asRecord(toolCall.args);
      const content = typeof args?.content === "string" ? args.content : "";
      const path = typeof args?.path === "string" ? args.path : "";
      if (content && path) push(`## Written: ${path}\n\n${content}`);
    }
  }

  return chunks.join("\n\n");
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
    for (const message of step.response?.messages ?? []) {
      if (message.role !== "assistant") continue;
      push(extractMessageText(message.content));
    }
  }
  for (const message of response.response?.messages ?? []) {
    if (message.role !== "assistant") continue;
    push(extractMessageText(message.content));
  }

  const textOutput = chunks.join("\n\n");
  if (textOutput.trim()) return textOutput;

  return collectToolStepArtifacts(response);
}

export async function persistAgentDeliverableIfMissing<TOOLS extends ToolSet>(input: {
  workspaceRoot: string;
  agentName: string;
  workflowName: string;
  runId: string;
  output: string;
  response: GenerateTextResult<TOOLS, unknown>;
}): Promise<string | null> {
  if (agentWroteDocsInStep(input.response)) return null;

  return persistHandoffAsAgentDoc({
    workspaceRoot: input.workspaceRoot,
    agentName: input.agentName,
    workflowName: input.workflowName,
    runId: input.runId,
    content: input.output,
  });
}

export async function persistHandoffAsAgentDoc(input: {
  workspaceRoot: string;
  agentName: string;
  workflowName: string;
  runId: string;
  content: string;
}): Promise<string | null> {
  const content = input.content.trim();
  if (!content) return null;

  const docsDir = agentDocsPath(input.agentName);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const workflowSlug = slugifySegment(input.workflowName) || "workflow";
  const relativePath = join(docsDir, `${stamp}-${workflowSlug}.md`);
  const fullPath = join(input.workspaceRoot, relativePath);

  const header = `# ${input.agentName} — ${input.workflowName}\n\n- Run: \`${input.runId}\`\n- Generated: ${new Date().toISOString()}\n\n---\n\n`;
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${header}${content}\n`, "utf-8");
  return relativePath.replace(/\\/g, "/");
}
