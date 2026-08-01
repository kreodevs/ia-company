import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { listTenantProducts } from "./product-registry.js";

const AGENT_DOC_DIRS = [
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

export function agentDocsPath(agentName: string, options?: { companyScoped?: boolean }): string {
  const prefix = agentName.split("-")[0];
  const map: Record<string, string> = {
    research: "docs/research",
    ceo: "docs/ceo",
    critic: "docs/critic",
    product: "docs/product",
    cto: "docs/cto",
    cfo: "docs/cfo",
    fullstack: "docs/fullstack",
    qa: "docs/qa",
    devops: "docs/devops",
    marketing: "docs/marketing",
    operations: "docs/operations",
    sales: "docs/sales",
    interaction: "docs/interaction",
    ui: "docs/ui",
  };
  const base = map[prefix] ?? "docs";
  if (options?.companyScoped) {
    return base.replace(/^docs\//, "docs/company/");
  }
  return base;
}

export async function bootstrapTenantWorkspaceLayout(
  workspaceRoot: string,
  tenantName?: string | null,
): Promise<void> {
  await mkdir(workspaceRoot, { recursive: true });

  for (const dir of AGENT_DOC_DIRS) {
    await mkdir(join(workspaceRoot, "docs", dir), { recursive: true });
    await mkdir(join(workspaceRoot, "docs", "company", dir), { recursive: true });
  }

  const readme = `# ${tenantName ?? "Tenant"} workspace

This folder is the **tenant sandbox root** for Auto-Company platform runs.

| Path | Purpose |
|------|---------|
| \`consensus.md\` | Shared cycle memory (also in the UI) |
| \`docs/research/\` | Market research and opportunity briefs |
| \`docs/company/\` | **Company-level** runs (discovery, weekly review) — not tied to one product |
| \`docs/ceo/\`, \`docs/product/\`, … | Deliverables per agent role |
| \`portfolio.md\` | Registered products for this tenant (read-only summary) |

**Important:** Do **not** create or list a \`projects/\` subdirectory here — it does not exist.
Product code repos live as **sibling folders** under the platform \`projects/\` tree (e.g. \`../snapog/\` from here).
When a run focuses a product, the workspace root switches to that product folder directly.

Write new files under \`docs/<role>/\`, not under \`projects/\`.
`;

  await writeFile(join(workspaceRoot, "README.md"), readme, "utf-8");
}

export async function syncTenantPortfolioManifest(
  tenantId: string,
  workspaceRoot: string,
): Promise<void> {
  const products = await listTenantProducts(tenantId);
  const lines = [
    "# Product portfolio (platform registry)",
    "",
    "Use Ops UI or API for GO/NO-GO. Product **code** lives in sibling workspace folders.",
    "",
  ];

  if (products.length === 0) {
    lines.push("_No registered products yet._");
  } else {
    for (const product of products) {
      lines.push(
        `- **${product.name}** (\`${product.slug}\`) — phase: ${product.phase}, workspace: \`../${product.slug}/\``,
      );
    }
  }

  lines.push("");
  await writeFile(join(workspaceRoot, "portfolio.md"), lines.join("\n"), "utf-8");
}

export function buildWorkspacePromptSection(options: {
  productSlug?: string;
  productName?: string;
  companyScoped?: boolean;
}): string {
  if (options.companyScoped) {
    return `
## Workspace (company-level run)
Your workspace root is the **tenant sandbox** — this run is **not** scoped to a single product.
- Save deliverables under \`docs/company/<role>/\` (e.g. \`docs/company/research/\`).
- \`consensus.md\` — tenant (company) memory for cycles and pipeline.
- \`portfolio.md\` — registered products; do not confuse this run with operating one product.
- Product code repos are sibling folders: \`../{product-slug}/\` — only read if explicitly needed.
`.trim();
  }

  if (options.productSlug) {
    return `
## Workspace (product run)
Your workspace root **is** the product repository for **${options.productName ?? options.productSlug}** (\`${options.productSlug}\`).
- Use \`.\` for the product root — ship code here (package.json, src/, etc.).
- Read \`consensus.md\` at the workspace root for cycle context.
- Do **not** look for \`projects/${options.productSlug}/\` — you are already inside it.
- Agent docs for this cycle: write under \`docs/<role>/\` relative to this root if needed.
`.trim();
  }

  return `
## Workspace (tenant sandbox)
Your workspace root is the **tenant sandbox** (platform path \`projects/{tenant-slug}/\`), not the monorepo root.
- \`consensus.md\` — shared memory for this cycle
- \`docs/research/\`, \`docs/ceo/\`, \`docs/product/\`, … — save deliverables here (see agent role)
- \`portfolio.md\` — summary of registered products and sibling workspace paths
- **There is no \`projects/\` folder inside this workspace.** Never call list_dir on \`projects\`.
- Product codebases are **sibling directories**: \`../{product-slug}/\` (only if you must inspect another product).
`.trim();
}
