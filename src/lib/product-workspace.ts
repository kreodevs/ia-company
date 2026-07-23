import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const AGENT_DOC_PREFIXES = [
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

export function resolveProductWorkspaceRoot(productSlug: string): string {
  const base = resolve(process.env.WORKSPACE_ROOT ?? process.cwd());
  const segment = productSlug.replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(base, "projects", segment);
}

export async function ensureProductWorkspace(productSlug: string): Promise<string> {
  const root = resolveProductWorkspaceRoot(productSlug);
  await mkdir(root, { recursive: true });
  for (const dir of AGENT_DOC_PREFIXES) {
    await mkdir(join(root, "docs", dir), { recursive: true });
  }
  return root;
}

export function slugifyProductName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function bootstrapProductWorkspace(
  productSlug: string,
  productName: string,
  description?: string,
): Promise<string> {
  const root = await ensureProductWorkspace(productSlug);
  const readme = `# ${productName}

${description ?? "Auto-Company product workspace."}

Created by Auto-Company autonomous pipeline.
`;
  await writeFile(join(root, "README.md"), readme, "utf8");
  await writeFile(
    join(root, "package.json"),
    JSON.stringify(
      {
        name: productSlug,
        version: "0.1.0",
        private: true,
        description: description ?? productName,
      },
      null,
      2,
    ),
    "utf8",
  );
  return root;
}
