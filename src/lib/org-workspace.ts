import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export function resolveOrgWorkspaceRoot(orgSlug: string): string {
  const base = resolve(process.env.WORKSPACE_ROOT ?? process.cwd());
  const segment = orgSlug.replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(base, "projects", "_org", segment);
}

export function slugifyOrgName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function syncOrgUnitToWorkspace(input: {
  slug: string;
  designMd?: string | null;
  tokens?: Record<string, unknown>;
}): Promise<string> {
  const root = resolveOrgWorkspaceRoot(input.slug);
  await mkdir(join(root, "docs", "marketing"), { recursive: true });
  await mkdir(join(root, "docs", "design"), { recursive: true });

  if (input.designMd?.trim()) {
    await writeFile(join(root, "design.md"), `${input.designMd.trim()}\n`, "utf8");
  }

  if (input.tokens && Object.keys(input.tokens).length > 0) {
    await writeFile(join(root, "tokens.json"), `${JSON.stringify(input.tokens, null, 2)}\n`, "utf8");
  }

  return root;
}
