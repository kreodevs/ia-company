import { join, resolve } from "node:path";
import { bootstrapTenantWorkspaceLayout } from "./workspace-layout.js";

export function resolveTenantWorkspaceRoot(tenantId: string, tenantSlug?: string | null): string {
  const base = resolve(process.env.WORKSPACE_ROOT ?? process.cwd());
  const segment = (tenantSlug ?? tenantId).replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(base, "projects", segment);
}

export async function ensureTenantWorkspace(
  tenantId: string,
  tenantSlug?: string | null,
  tenantName?: string | null,
): Promise<string> {
  const root = resolveTenantWorkspaceRoot(tenantId, tenantSlug);
  await bootstrapTenantWorkspaceLayout(root, tenantName ?? tenantSlug);
  return root;
}
