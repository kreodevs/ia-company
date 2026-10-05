import type { OfficeActivityItem, OfficeDashboard } from "./api";

/** Map legacy encargo detail URLs to Mi trabajo live panel. */
export function encargoHrefToTrabajoActivos(href: string | null | undefined): string | null {
  if (!href) return null;
  const match = href.match(/\/office\/encargos\/([^/?#]+)/);
  if (match) return `/office/trabajo?tab=activos&run=${encodeURIComponent(match[1])}`;
  if (href.startsWith("/office/trabajo")) return href;
  return null;
}

export function runIdFromActivity(item: OfficeActivityItem): string | null {
  const fromHref = encargoHrefToTrabajoActivos(item.href);
  if (!fromHref) return null;
  const match = fromHref.match(/run=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Best link to see what is running now (single run opens live panel). */
export function officeActivosHref(dashboard: OfficeDashboard): string {
  const activeItems = dashboard.activity.filter((a) => a.type === "run_active");
  if (activeItems.length === 1) {
    const direct = encargoHrefToTrabajoActivos(activeItems[0].href);
    if (direct) return direct;
  }
  if (dashboard.stats.activeRuns === 1 && activeItems[0]) {
    const direct = encargoHrefToTrabajoActivos(activeItems[0].href);
    if (direct) return direct;
  }
  return "/office/trabajo?tab=activos";
}
