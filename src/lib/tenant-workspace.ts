import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

export function resolveTenantWorkspaceRoot(tenantId: string, tenantSlug?: string | null): string {
  const base = resolve(process.env.WORKSPACE_ROOT ?? process.cwd());
  const segment = (tenantSlug ?? tenantId).replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(base, "projects", segment);
}

export async function ensureTenantWorkspace(tenantId: string, tenantSlug?: string | null): Promise<string> {
  const root = resolveTenantWorkspaceRoot(tenantId, tenantSlug);
  await mkdir(root, { recursive: true });
  return root;
}
