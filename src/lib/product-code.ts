import { execFile } from "node:child_process";
import { promises as fs, type Dirent, type Stats } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { prisma } from "./prisma.js";
import { resolveProductWorkspaceRoot } from "./product-workspace.js";

const execFileAsync = promisify(execFile);

const MAX_FILE_BYTES = 1_000_000; // 1 MB
const MAX_TREE_ENTRIES = 2000;
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".turbo",
  "coverage",
  ".cache",
  ".pnpm-store",
]);

export interface ProductTreeEntry {
  path: string; // POSIX-style relative path
  name: string;
  type: "file" | "dir";
  size: number;
  children?: ProductTreeEntry[];
}

export interface ProductFile {
  path: string;
  content: string;
  size: number;
  truncated: boolean;
  binary: boolean;
}

export interface ProductAgentDocFile {
  path: string;
  name: string;
  role: string;
  size: number;
  modifiedAt: string;
}

export interface ProductAgentDocsIndex {
  roles: Array<{ role: string; docs: ProductAgentDocFile[] }>;
  total: number;
}

const DOC_FILE_EXTENSIONS = new Set([".md", ".markdown", ".mdx"]);

export interface CreateRepoInput {
  tenantId: string;
  productId: string;
  repoName: string;
  visibility: "private" | "public";
  description?: string;
  commitMessage?: string;
  githubToken: string;
}

export interface CreateRepoResult {
  repoUrl: string;
  fullName: string;
  commitSha: string;
  pushed: boolean;
  message: string;
}

function safeJoin(root: string, requested: string): string {
  const decoded = decodeURIComponent(requested ?? "");
  const normalized = decoded.replace(/^[/\\]+/, "");
  const abs = resolve(root, normalized);
  const rel = relative(root, abs);
  if (rel.startsWith("..") || abs === root && decoded.length > 0) {
    throw new Error("Path escapes product workspace");
  }
  return abs;
}

async function walk(root: string, current: string, depth: number): Promise<ProductTreeEntry[]> {
  if (depth > 12) return [];
  let entries: Dirent[];
  try {
    entries = await fs.readdir(current, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: ProductTreeEntry[] = [];
  entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".gitignore" && e.name !== ".env.example") continue;
    if (e.isDirectory()) {
      if (IGNORED_DIRS.has(e.name)) continue;
      const children = await walk(root, join(current, e.name), depth + 1);
      out.push({
        path: relative(root, join(current, e.name)).split(sep).join("/"),
        name: e.name,
        type: "dir",
        size: 0,
        children,
      });
    } else if (e.isFile()) {
      let size = 0;
      try {
        const s = await fs.stat(join(current, e.name));
        size = s.size;
      } catch {
        size = 0;
      }
      out.push({
        path: relative(root, join(current, e.name)).split(sep).join("/"),
        name: e.name,
        type: "file",
        size,
      });
    }
  }
  return out;
}

export async function listProductTree(productSlug: string, subPath = ""): Promise<ProductTreeEntry[]> {
  const root = resolveProductWorkspaceRoot(productSlug);
  const start = subPath ? safeJoin(root, subPath) : root;
  const all = await walk(root, start, 0);
  if (countEntries(all) > MAX_TREE_ENTRIES) {
    throw new Error("Tree too large to list in one call");
  }
  return all;
}

function countEntries(entries: ProductTreeEntry[]): number {
  let n = 0;
  for (const e of entries) {
    n += 1;
    if (e.children) n += countEntries(e.children);
  }
  return n;
}

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".bmp",
  ".pdf", ".zip", ".tar", ".gz", ".tgz", ".7z", ".rar",
  ".mp3", ".mp4", ".mov", ".avi", ".mkv", ".wav", ".flac",
  ".ttf", ".otf", ".woff", ".woff2", ".eot",
  ".class", ".jar", ".war", ".so", ".dll", ".dylib",
  ".exe", ".bin",
]);

export function isBinaryPath(path: string): boolean {
  const dot = path.lastIndexOf(".");
  if (dot < 0) return false;
  return BINARY_EXTENSIONS.has(path.slice(dot).toLowerCase());
}

export async function readProductFile(productSlug: string, relativePath: string): Promise<ProductFile> {
  const root = resolveProductWorkspaceRoot(productSlug);
  const abs = safeJoin(root, relativePath);
  let stat: Stats;
  try {
    stat = await fs.stat(abs);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("File not found");
    }
    throw err;
  }
  if (!stat.isFile()) throw new Error("Not a file");
  const binary = isBinaryPath(relativePath);
  const truncated = stat.size > MAX_FILE_BYTES;
  const content = binary
    ? ""
    : await fs.readFile(abs, { encoding: truncated ? "utf-8" : "utf-8" });
  return {
    path: relativePath,
    content: truncated ? content.slice(0, MAX_FILE_BYTES) : content,
    size: stat.size,
    truncated,
    binary,
  };
}

function isDocFile(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return false;
  return DOC_FILE_EXTENSIONS.has(name.slice(dot).toLowerCase());
}

async function collectDocsUnderDir(
  root: string,
  role: string,
  dir: string,
  depth: number,
  out: ProductAgentDocFile[],
): Promise<void> {
  if (depth > 4) return;
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".")) continue;
    const abs = join(dir, entry.name);
    const rel = relative(root, abs).split(sep).join("/");
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      await collectDocsUnderDir(root, role, abs, depth + 1, out);
      continue;
    }
    if (!entry.isFile() || !isDocFile(entry.name)) continue;
    try {
      const stat = await fs.stat(abs);
      out.push({
        path: rel,
        name: entry.name,
        role,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      });
    } catch {
      // skip unreadable
    }
  }
}

/** Lists markdown deliverables under projects/{slug}/docs/{role}/ */
export async function listProductAgentDocs(productSlug: string): Promise<ProductAgentDocsIndex> {
  const root = resolveProductWorkspaceRoot(productSlug);
  const docsRoot = join(root, "docs");
  const roles: ProductAgentDocsIndex["roles"] = [];
  let total = 0;

  let roleEntries: Dirent[];
  try {
    roleEntries = await fs.readdir(docsRoot, { withFileTypes: true });
  } catch {
    return { roles: [], total: 0 };
  }

  for (const entry of roleEntries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const docs: ProductAgentDocFile[] = [];
    await collectDocsUnderDir(root, entry.name, join(docsRoot, entry.name), 0, docs);
    if (docs.length === 0) continue;
    docs.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    roles.push({ role: entry.name, docs });
    total += docs.length;
  }

  return { roles, total };
}

export async function ensureProductRepoNotInitialized(productSlug: string): Promise<boolean> {
  const root = resolveProductWorkspaceRoot(productSlug);
  try {
    const stat = await fs.stat(join(root, ".git"));
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function createProductGitHubRepo(input: CreateRepoInput): Promise<CreateRepoResult> {
  const product = await prisma.tenantProduct.findFirst({
    where: { id: input.productId, tenantId: input.tenantId },
  });
  if (!product) throw new Error("Product not found");
  const root = resolveProductWorkspaceRoot(product.slug);

  if (!(await ensureProductRepoNotInitialized(product.slug))) {
    await execFileAsync("git", ["init", "-b", "main"], { cwd: root });
  }

  const env = { ...process.env, GH_TOKEN: input.githubToken, GIT_TERMINAL_PROMPT: "0" };
  const description = input.description?.trim() || product.description || product.name;

  let createdRepoUrl: string;
  let fullName: string;
  try {
    const args = [
      "repo",
      "create",
      input.repoName,
      `--${input.visibility}`,
      "--description",
      description,
      "--source",
      root,
      "--remote",
      "origin",
      "--push",
    ];
    const { stdout } = await execFileAsync("gh", args, { cwd: root, env });
    const trimmed = stdout.trim();
    createdRepoUrl = trimmed || `https://github.com/${input.repoName}`;
    fullName = input.repoName;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(message)) {
      throw new Error("A repository with that name already exists in this GitHub account");
    }
    throw new Error(`gh repo create failed: ${message}`);
  }

  let commitSha = "";
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root });
    commitSha = stdout.trim();
  } catch {
    commitSha = "";
  }

  return {
    repoUrl: createdRepoUrl,
    fullName,
    commitSha,
    pushed: true,
    message: "Repository created and initial commit pushed.",
  };
}