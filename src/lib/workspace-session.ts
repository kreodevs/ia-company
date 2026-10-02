import { execFile } from "node:child_process";
import { mkdir, readdir, stat } from "node:fs/promises";
import { promises as fs, type Dirent } from "node:fs";
import { promisify } from "node:util";
import { join, relative, resolve, sep } from "node:path";

const execFileAsync = promisify(execFile);

export interface WorkspaceSnapshotData {
  filesChanged: string[];
  manifest: Record<string, { size: number; modifiedAt: string }>;
  totalBytes: number;
  commitSha: string | null;
}

export interface WorkspaceDiff {
  added: string[];
  modified: string[];
  removed: string[];
}

export interface WorkspaceTreeEntry {
  path: string;
  name: string;
  type: "file" | "dir";
  size: number;
  children?: WorkspaceTreeEntry[];
}

const MAX_TREE_ENTRIES = 2000;
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage", ".cache", ".pnpm-store"]);
const SESSION_DOC_DIRS = [
  "research",
  "ceo",
  "critic",
  "product",
  "cto",
  "cfo",
  "fullstack",
  "qa",
  "devops",
  "marketing",
  "operations",
  "sales",
  "interaction",
  "ui",
] as const;

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/** Returns the isolated workspace for one agent session. */
export function resolveSessionWorkspaceRoot(
  tenantId: string,
  sessionId: string,
  tenantSlug?: string | null,
): string {
  const base = resolve(process.env.WORKSPACE_ROOT ?? process.cwd());
  return join(base, "projects", safeSegment(tenantSlug ?? tenantId), "sessions", safeSegment(sessionId));
}

/** Creates the session directory, bootstraps docs layout, and initializes its local git history. */
export async function ensureSessionWorkspace(
  tenantId: string,
  sessionId: string,
  tenantSlug?: string | null,
): Promise<string> {
  const workspaceRoot = resolveSessionWorkspaceRoot(tenantId, sessionId, tenantSlug);
  await mkdir(workspaceRoot, { recursive: true });
  for (const dir of SESSION_DOC_DIRS) {
    await mkdir(join(workspaceRoot, "docs", dir), { recursive: true });
  }

  try {
    await execFileAsync("git", ["rev-parse", "--git-dir"], { cwd: workspaceRoot });
  } catch {
    await execFileAsync("git", ["init", "--quiet"], { cwd: workspaceRoot });
    await execFileAsync("git", ["config", "user.email", "auto-company@localhost"], { cwd: workspaceRoot });
    await execFileAsync("git", ["config", "user.name", "Auto-Company Session"], { cwd: workspaceRoot });
  }

  return workspaceRoot;
}

function safeJoin(root: string, requested: string): string {
  const decoded = decodeURIComponent(requested ?? "");
  const normalized = decoded.replace(/^[/\\]+/, "");
  const abs = resolve(root, normalized);
  const rel = relative(root, abs);
  if (rel.startsWith("..")) throw new Error("Path escapes workspace");
  return abs;
}

async function walkTree(root: string, current: string, depth: number): Promise<WorkspaceTreeEntry[]> {
  if (depth > 12) return [];
  let entries: Dirent[];
  try {
    entries = await fs.readdir(current, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: WorkspaceTreeEntry[] = [];
  entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".gitignore" && entry.name !== ".env.example") continue;
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const children = await walkTree(root, join(current, entry.name), depth + 1);
      out.push({
        path: relative(root, join(current, entry.name)).split(sep).join("/"),
        name: entry.name,
        type: "dir",
        size: 0,
        children,
      });
    } else if (entry.isFile()) {
      let size = 0;
      try {
        const fileStat = await fs.stat(join(current, entry.name));
        size = fileStat.size;
      } catch {
        size = 0;
      }
      out.push({
        path: relative(root, join(current, entry.name)).split(sep).join("/"),
        name: entry.name,
        type: "file",
        size,
      });
    }
  }
  return out;
}

function countEntries(entries: WorkspaceTreeEntry[]): number {
  let total = 0;
  for (const entry of entries) {
    total += 1;
    if (entry.children) total += countEntries(entry.children);
  }
  return total;
}

export async function listSessionWorkspaceTree(workspaceRoot: string, subPath = ""): Promise<WorkspaceTreeEntry[]> {
  const root = resolve(workspaceRoot);
  const start = subPath ? safeJoin(root, subPath) : root;
  const all = await walkTree(root, start, 0);
  if (countEntries(all) > MAX_TREE_ENTRIES) throw new Error("Tree too large to list in one call");
  return all;
}

/** Builds a bounded-to-the-workspace manifest and commits the current state. */
export async function snapshotSessionWorkspace(workspaceRoot: string): Promise<WorkspaceSnapshotData> {
  const root = resolve(workspaceRoot);
  const filesChanged: string[] = [];
  const manifest: Record<string, { size: number; modifiedAt: string }> = {};
  let totalBytes = 0;

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".git") continue;
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      const info = await stat(absolutePath);
      const path = relative(root, absolutePath);
      filesChanged.push(path);
      totalBytes += info.size;
      manifest[path] = { size: info.size, modifiedAt: info.mtime.toISOString() };
    }
  }

  await walk(root);
  let commitSha: string | null = null;
  try {
    await execFileAsync("git", ["add", "-A"], { cwd: root });
    const { stdout: status } = await execFileAsync("git", ["status", "--porcelain"], { cwd: root });
    if (status.trim()) {
      await execFileAsync("git", ["commit", "--quiet", "-m", "workspace snapshot"], { cwd: root });
    }
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root });
    commitSha = stdout.trim() || null;
  } catch {
    // Snapshot persistence remains useful in deployments without git.
  }

  return { filesChanged, manifest, totalBytes, commitSha };
}

export function diffWorkspaceSnapshots(
  previous: Record<string, { size?: number; modifiedAt?: string }>,
  current: Record<string, { size?: number; modifiedAt?: string }>,
): WorkspaceDiff {
  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];
  for (const path of Object.keys(current)) {
    if (!previous[path]) added.push(path);
    else if (previous[path].size !== current[path].size || previous[path].modifiedAt !== current[path].modifiedAt) modified.push(path);
  }
  for (const path of Object.keys(previous)) if (!current[path]) removed.push(path);
  return { added: added.sort(), modified: modified.sort(), removed: removed.sort() };
}
