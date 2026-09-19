import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  Bot,
  ChevronDown,
  ClipboardList,
  DollarSign,
  Inbox,
  TrendingUp,
} from "lucide-react";
import type { OfficeDashboard } from "../../lib/api";
import { DashboardKPI } from "../organisms/DashboardKPI";

interface OfficePulseDrawerProps {
  dashboard: OfficeDashboard;
  spendPct: number;
  portfolioRoi: number | null;
}

export default function OfficePulseDrawer({
  dashboard,
  spendPct,
  portfolioRoi,
}: OfficePulseDrawerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const activeSummary = [
    dashboard.stats.activeRuns > 0
      ? t("office.pulse.activeRuns", { count: dashboard.stats.activeRuns })
      : null,
    dashboard.stats.pendingDecisions > 0
      ? t("office.pulse.pendingDecisions", { count: dashboard.stats.pendingDecisions })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="office-pulse-drawer" data-open={open ? "true" : "false"}>
      <button
        type="button"
        className="office-pulse-toggle interactive"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className="office-pulse-toggle-label">
          <Activity className="office-pulse-toggle-icon" aria-hidden />
          {t("office.pulse.title")}
        </span>
        {!open && activeSummary ? (
          <span className="office-pulse-summary">{activeSummary}</span>
        ) : null}
        <ChevronDown
          className={`office-pulse-chevron ${open ? "" : "-rotate-90"}`}
          aria-hidden
        />
        <span className="sr-only">{open ? t("office.pulse.hide") : t("office.pulse.show")}</span>
      </button>

      {open ? (
        <div className="office-pulse-grid">
          <Link to="/settings?tab=limits" className="office-pulse-kpi-link">
            <DashboardKPI
              title={t("office.kpis.spend")}
              value={`$${dashboard.usage.totalCostUsd.toFixed(2)}`}
              trend={spendPct > 80 ? spendPct : undefined}
              trendLabel={
                dashboard.usage.limits.maxCostUsdPerMonth
                  ? t("office.kpis.spendLimit", {
                      limit: dashboard.usage.limits.maxCostUsdPerMonth.toFixed(0),
                    })
                  : t("office.kpis.noLimit")
              }
              icon={DollarSign}
              variant={spendPct > 80 ? "warning" : "default"}
            />
          </Link>
          <Link to="/office/encargos" className="office-pulse-kpi-link">
            <DashboardKPI
              title={t("office.kpis.activeRuns")}
              value={String(dashboard.stats.activeRuns)}
              icon={ClipboardList}
              variant={dashboard.stats.activeRuns > 0 ? "primary" : "default"}
            />
          </Link>
          <Link to="/office/pendientes" className="office-pulse-kpi-link">
            <DashboardKPI
              title={t("office.kpis.pendingDecisions")}
              value={String(dashboard.stats.pendingDecisions)}
              icon={Inbox}
              variant={dashboard.stats.pendingDecisions > 0 ? "warning" : "default"}
            />
          </Link>
          <Link to="/settings/specialists" className="office-pulse-kpi-link">
            <DashboardKPI
              title={t("office.kpis.agents")}
              value={String(dashboard.stats.agentsTotal)}
              trendLabel={`${dashboard.agents.filter((a) => a.status === "busy").length} ${t("office.agents.busy").toLowerCase()}`}
              icon={Bot}
            />
          </Link>
          <Link to="/products?tab=active" className="office-pulse-kpi-link">
            <DashboardKPI
              title={t("office.kpis.roi")}
              value={
                portfolioRoi != null
                  ? `${portfolioRoi >= 0 ? "+" : ""}${portfolioRoi}%`
                  : "—"
              }
              trendLabel={
                portfolioRoi != null && portfolioRoi >= 0
                  ? t("office.kpis.roiPositive")
                  : t("office.kpis.roiNegative")
              }
              icon={TrendingUp}
              variant={
                portfolioRoi != null && portfolioRoi >= 0 ? "success" : "default"
              }
              reverseTrend={portfolioRoi != null && portfolioRoi < 0}
            />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
