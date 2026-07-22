import type { OpencodeFileDiff } from "./opencode-client.js";

export interface NormalizedOpencodeDiffEntry {
  path: string;
  additions: number | null;
  deletions: number | null;
  raw: OpencodeFileDiff;
}

export function normalizeOpencodeDiff(diff: unknown): NormalizedOpencodeDiffEntry[] {
  if (!Array.isArray(diff)) return [];

  return diff
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as OpencodeFileDiff;
      const path =
        (typeof row.path === "string" && row.path) ||
        (typeof row.file === "string" && row.file) ||
        (typeof (row as { relativePath?: string }).relativePath === "string"
          ? (row as { relativePath: string }).relativePath
          : null);
      if (!path) return null;
      return {
        path,
        additions: typeof row.additions === "number" ? row.additions : null,
        deletions: typeof row.deletions === "number" ? row.deletions : null,
        raw: row,
      };
    })
    .filter((row): row is NormalizedOpencodeDiffEntry => row !== null);
}
