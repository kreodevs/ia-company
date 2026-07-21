/** Match tenant copies to platform templates by stable platform id, then by name. */

export interface TemplateMatchRow {
  id: string;
  name: string;
  platformSourceId: string | null;
}

export function findTenantTemplateMatch<T extends TemplateMatchRow>(
  tenantRows: T[],
  platformId: string,
  platformName: string,
): T | undefined {
  const bySource = tenantRows.find((row) => row.platformSourceId === platformId);
  if (bySource) return bySource;
  return tenantRows.find((row) => row.name === platformName);
}
