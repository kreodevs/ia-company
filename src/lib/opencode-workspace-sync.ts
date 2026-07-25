import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { normalizeOpencodeDiff } from "./opencode-diff.js";

export async function persistOpencodeDiffManifest(input: {
  workspaceRoot: string;
  runId: string;
  delegationId: string;
  sessionId: string;
  diff: unknown[];
  summary: string;
}): Promise<string> {
  const normalized = normalizeOpencodeDiff(input.diff);
  const relativeDir = ".opencode";
  const relativePath = join(relativeDir, `${input.runId}.json`);
  const absolutePath = join(input.workspaceRoot, relativePath);

  await mkdir(join(input.workspaceRoot, relativeDir), { recursive: true });
  await writeFile(
    absolutePath,
    `${JSON.stringify(
      {
        runId: input.runId,
        delegationId: input.delegationId,
        sessionId: input.sessionId,
        summary: input.summary,
        syncedAt: new Date().toISOString(),
        files: normalized.map((entry) => ({
          path: entry.path,
          additions: entry.additions,
          deletions: entry.deletions,
        })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return relativePath.replace(/\\/g, "/");
}

export async function persistOpencodeSummaryDoc(input: {
  workspaceRoot: string;
  runId: string;
  summary: string;
  diff: unknown[];
}): Promise<string | null> {
  const normalized = normalizeOpencodeDiff(input.diff);
  if (!input.summary.trim() && normalized.length === 0) return null;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const relativePath = join("docs", "devops", `${stamp}-opencode-${input.runId.slice(0, 8)}.md`);
  const absolutePath = join(input.workspaceRoot, relativePath);

  const lines = [
    `# OpenCode implementation — ${input.runId}`,
    "",
    `- Synced: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    input.summary.trim() || "_No summary returned by OpenCode._",
    "",
  ];

  if (normalized.length > 0) {
    lines.push("## Files changed", "");
    for (const entry of normalized) {
      const stats =
        entry.additions != null || entry.deletions != null
          ? ` (+${entry.additions ?? 0}/-${entry.deletions ?? 0})`
          : "";
      lines.push(`- \`${entry.path}\`${stats}`);
    }
    lines.push("");
  }

  await mkdir(join(input.workspaceRoot, "docs", "devops"), { recursive: true });
  await writeFile(absolutePath, `${lines.join("\n")}\n`, "utf8");
  return relativePath.replace(/\\/g, "/");
}
