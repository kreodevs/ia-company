import { execFile } from "node:child_process";
import { access, rm } from "node:fs/promises";
import { promisify } from "node:util";
import { resolveProductWorkspaceRoot } from "./product-workspace.js";

const execFileAsync = promisify(execFile);

export interface ParsedGitHubRepo {
  owner: string;
  repo: string;
  fullName: string;
  htmlUrl: string;
}

export interface GitHubRepoContext {
  parsed: ParsedGitHubRepo;
  description: string | null;
  defaultBranch: string;
  topics: string[];
  languages: Record<string, number>;
  readmeExcerpt: string | null;
  packageJsonExcerpt: string | null;
  cloneUrl: string;
}

const GITHUB_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "auto-company",
});

export function parseGitHubRepoUrl(raw: string): ParsedGitHubRepo | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const ssh = /^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i.exec(trimmed);
  if (ssh) {
    const owner = ssh[1]!;
    const repo = ssh[2]!.replace(/\.git$/, "");
    return { owner, repo, fullName: `${owner}/${repo}`, htmlUrl: `https://github.com/${owner}/${repo}` };
  }

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (!url.hostname.replace(/^www\./, "").endsWith("github.com")) return null;
    const parts = url.pathname.replace(/^\/+/, "").split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0]!;
    const repo = parts[1]!.replace(/\.git$/, "");
    return { owner, repo, fullName: `${owner}/${repo}`, htmlUrl: `https://github.com/${owner}/${repo}` };
  } catch {
    return null;
  }
}

async function githubFetch<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, { headers: GITHUB_HEADERS(token) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status} for ${path}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

async function fetchReadmeExcerpt(token: string, owner: string, repo: string): Promise<string | null> {
  try {
    const data = await githubFetch<{ content?: string; encoding?: string }>(
      token,
      `/repos/${owner}/${repo}/readme`,
    );
    if (!data.content || data.encoding !== "base64") return null;
    const text = Buffer.from(data.content, "base64").toString("utf-8");
    return text.slice(0, 8000);
  } catch {
    return null;
  }
}

async function fetchRootFileExcerpt(
  token: string,
  owner: string,
  repo: string,
  fileName: string,
): Promise<string | null> {
  try {
    const data = await githubFetch<{ content?: string; encoding?: string }>(
      token,
      `/repos/${owner}/${repo}/contents/${fileName}`,
    );
    if (!data.content || data.encoding !== "base64") return null;
    const text = Buffer.from(data.content, "base64").toString("utf-8");
    return text.slice(0, 4000);
  } catch {
    return null;
  }
}

export async function fetchGitHubRepoContext(
  token: string,
  repoUrl: string,
): Promise<GitHubRepoContext> {
  const parsed = parseGitHubRepoUrl(repoUrl);
  if (!parsed) throw new Error("Invalid GitHub repository URL");

  const repo = await githubFetch<{
    description: string | null;
    default_branch: string;
    clone_url: string;
    topics?: string[];
  }>(token, `/repos/${parsed.fullName}`);

  const [languages, readmeExcerpt, packageJsonExcerpt] = await Promise.all([
    githubFetch<Record<string, number>>(token, `/repos/${parsed.fullName}/languages`).catch(
      () => ({}),
    ),
    fetchReadmeExcerpt(token, parsed.owner, parsed.repo),
    fetchRootFileExcerpt(token, parsed.owner, parsed.repo, "package.json"),
  ]);

  return {
    parsed,
    description: repo.description,
    defaultBranch: repo.default_branch ?? "main",
    topics: repo.topics ?? [],
    languages,
    readmeExcerpt,
    packageJsonExcerpt,
    cloneUrl: repo.clone_url,
  };
}

export async function cloneGitHubRepoToWorkspace(
  token: string,
  repoUrl: string,
  productSlug: string,
  options: { replaceExisting?: boolean } = {},
): Promise<{ cloned: boolean; path: string }> {
  const parsed = parseGitHubRepoUrl(repoUrl);
  if (!parsed) throw new Error("Invalid GitHub repository URL");

  const root = resolveProductWorkspaceRoot(productSlug);
  let exists = false;
  try {
    await access(root);
    exists = true;
  } catch {
    exists = false;
  }

  if (exists && !options.replaceExisting) {
    return { cloned: false, path: root };
  }

  if (exists && options.replaceExisting) {
    await rm(root, { recursive: true, force: true });
  }

  const authedUrl = `https://x-access-token:${token}@github.com/${parsed.fullName}.git`;
  await execFileAsync("git", ["clone", "--depth", "1", authedUrl, root], {
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    timeout: 120_000,
  });

  return { cloned: true, path: root };
}

export function formatGitHubContextForAgents(ctx: GitHubRepoContext): string {
  const langList = Object.entries(ctx.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, bytes]) => `${name} (${bytes} bytes)`)
    .join(", ");

  const sections = [
    `# GitHub repository: ${ctx.parsed.fullName}`,
    `URL: ${ctx.parsed.htmlUrl}`,
    `Default branch: ${ctx.defaultBranch}`,
    ctx.description ? `GitHub description: ${ctx.description}` : null,
    ctx.topics.length ? `Topics: ${ctx.topics.join(", ")}` : null,
    langList ? `Languages: ${langList}` : null,
    ctx.readmeExcerpt ? `\n## README excerpt\n${ctx.readmeExcerpt}` : null,
    ctx.packageJsonExcerpt ? `\n## package.json\n${ctx.packageJsonExcerpt}` : null,
  ].filter(Boolean);

  return sections.join("\n");
}
