import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Activity, Inbox, Target } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import {
  getDashboard,
  getObjectivesSummary,
  type DepartmentManagementRow,
  type ObjectiveSummaryRow,
  type OfficeDashboard,
} from "../../lib/api";
import PageLoading from "../ui/PageLoading";
import KpiCard from "../ui/KpiCard";
import Panel from "../ui/Panel";
import StatusPill from "../ui/StatusPill";
import EmptyState from "../ui/EmptyState";
import { DataTable, type DataTableColumn } from "../organisms/DataTable";
import { OfficeCostsPanel } from "./OfficeCostsPanel";

function formatUsd(value: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(
    value,
  );
}

type PeriodKey = "30d" | "all";

function sinceForPeriod(period: PeriodKey): string | undefined {
  if (period === "all") return undefined;
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
}

/**
 * Fase H — dashboard empresarial (Kreo KPI + DataTable + Panel).
 */
export function Dashboard() {
  const { t } = useTranslation();
  const [dash, setDash] = useState<OfficeDashboard | null>(null);
  const [objectives, setObjectives] = useState<ObjectiveSummaryRow[]>([]);
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDash(null);
    Promise.all([getDashboard({ since: sinceForPeriod(period) }), getObjectivesSummary()])
      .then(([d, objs]) => {
        setDash(d);
        setObjectives(objs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("office.companyDashboard.loadError")));
  }, [period, t]);

  const departmentColumns: DataTableColumn[] = useMemo(
    () => [
      {
        field: "departmentName",
        header: t("office.companyDashboard.colDepartment"),
        sortable: true,
        body: (row: DepartmentManagementRow) => (
          <Link className="font-medium text-[var(--primary)] hover:underline" to={row.href}>
            {row.departmentName}
          </Link>
        ),
      },
      {
        field: "activeCount",
        header: t("office.companyDashboard.colActive"),
        sortable: true,
        body: (row: DepartmentManagementRow) => (
          <Link className="tabular-nums hover:underline" to={`${row.href}?tab=work`}>
            {row.activeCount}
          </Link>
        ),
      },
      {
        field: "blockedCount",
        header: t("office.companyDashboard.colBlocked"),
        sortable: true,
        body: (row: DepartmentManagementRow) =>
          row.blockedCount > 0 ? (
            <Link to="/office/inbox?category=blocked">
              <StatusPill status="running">{row.blockedCount}</StatusPill>
            </Link>
          ) : (
            <span className="tabular-nums text-[var(--foreground-muted)]">0</span>
          ),
      },
      {
        field: "costUsd",
        header: t("office.companyDashboard.colCost"),
        sortable: true,
        body: (row: DepartmentManagementRow) => formatUsd(row.costUsd),
      },
      {
        field: "deliveredCount",
        header: t("office.companyDashboard.colDelivered"),
        sortable: true,
        body: (row: DepartmentManagementRow) => <span className="tabular-nums">{row.deliveredCount}</span>,
      },
    ],
    [t],
  );

  if (error) {
    return <EmptyState title={t("office.companyDashboard.loadError")} description={error} />;
  }
  if (!dash) return <PageLoading message={t("office.companyDashboard.loading")} />;

  const { stats, usage, activity, management, departmentMetrics } = dash;
  const costLimit = usage.limits.maxCostUsdPerMonth;

  return (
    <div className="space-y-6">
      <div className="command-toolbar">
        <span className="text-sm font-medium text-[var(--foreground-muted)]">{t("office.companyDashboard.period")}</span>
        <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={period === "30d" ? "default" : "outline"}
          onClick={() => setPeriod("30d")}
        >
          {t("office.companyDashboard.period30d")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={period === "all" ? "default" : "outline"}
          onClick={() => setPeriod("all")}
        >
          {t("office.companyDashboard.periodAll")}
        </Button>
        </div>
      </div>

      <section className="hero-strip command-stat-bento" aria-label={t("office.companyDashboard.kpiAria")}>
        <KpiCard
          label={t("office.companyDashboard.costPeriod")}
          value={formatUsd(management.totalCostUsd)}
          delta={t("office.companyDashboard.costMonthDelta", {
            amount: formatUsd(usage.totalCostUsd),
            limit: costLimit ? t("office.companyDashboard.costMonthLimit", { limit: formatUsd(costLimit) }) : "",
          })}
        />
        <KpiCard
          label={t("office.companyDashboard.activeJobs")}
          value={stats.activeRuns}
          delta={t("office.companyDashboard.activeJobsDelta", { count: management.activeRuns })}
          trend={stats.activeRuns > 0 ? "up" : "flat"}
        />
        <KpiCard
          label={t("office.companyDashboard.blockedWork")}
          value={management.blockedWorkItems}
          delta={t("office.companyDashboard.blockedWorkDelta")}
          trend={management.blockedWorkItems > 0 ? "down" : "up"}
        />
        <KpiCard
          label={t("office.companyDashboard.pendingDecisions")}
          value={management.pendingDecisions}
          delta={t("office.companyDashboard.pendingDecisionsDelta")}
          trend={management.pendingDecisions > 0 ? "down" : "up"}
        />
        <KpiCard
          label={t("office.companyDashboard.pendingHandoffs")}
          value={management.pendingHandoffs}
          delta={t("office.companyDashboard.pendingHandoffsDelta")}
        />
        <KpiCard
          label={t("office.companyDashboard.goalsInitiatives")}
          value={management.activeGoals}
          delta={t("office.companyDashboard.goalsInitiativesDelta", { count: management.activeInitiatives })}
        />
        <KpiCard
          label={t("office.companyDashboard.deliveriesPeriod")}
          value={management.recentDeliveries}
          delta={t("office.companyDashboard.deliveriesDelta")}
          trend={management.recentDeliveries > 0 ? "up" : "flat"}
        />
        <KpiCard
          label={t("office.companyDashboard.avgBlockedHours")}
          value={management.avgBlockedWorkItemHours ?? "—"}
          delta={t("office.companyDashboard.avgBlockedHoursDelta")}
        />
        <KpiCard
          label={t("office.companyDashboard.avgHandoffHours")}
          value={management.avgHandoffAcceptHours ?? "—"}
          delta={t("office.companyDashboard.avgHandoffHoursDelta")}
        />
        <KpiCard
          label={t("office.companyDashboard.docFirstPass")}
          value={
            management.documentFirstPassApprovalRate != null
              ? `${management.documentFirstPassApprovalRate}%`
              : "—"
          }
          delta={t("office.companyDashboard.docFirstPassDelta")}
        />
        <KpiCard
          label={t("office.companyDashboard.investmentRevenue")}
          value={formatUsd(stats.totalInvestedUsd)}
          delta={t("office.companyDashboard.investmentRevenueDelta", { amount: formatUsd(stats.totalRevenueUsd) })}
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <Button variant="default" size="sm" asChild>
          <Link to="/office/inbox">
            <Inbox className="mr-1.5 h-4 w-4" aria-hidden />
            {t("office.companyDashboard.ctaInbox")}
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/office/trabajo">{t("office.companyDashboard.ctaJobs")}</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/office/objetivos">
            <Target className="mr-1.5 h-4 w-4" aria-hidden />
            {t("office.companyDashboard.ctaObjectives")}
          </Link>
        </Button>
      </div>

      {objectives.length > 0 && (
        <Panel title={t("office.companyDashboard.objectivesPanelTitle")} subtitle={t("office.companyDashboard.objectivesPanelSubtitle")}>
          <DataTable
            columns={[
              {
                field: "name",
                header: t("office.companyDashboard.colObjective"),
                body: (row: ObjectiveSummaryRow) => (
                  <Link className="font-medium text-[var(--primary)] hover:underline" to={`/office/objetivos/${row.id}`}>
                    {row.name}
                  </Link>
                ),
              },
              {
                field: "encargoCount",
                header: t("office.companyDashboard.colJobs"),
                body: (row: ObjectiveSummaryRow) => (
                  <Link className="tabular-nums hover:underline" to={`/office/trabajo?tab=todos&companyGoalId=${row.id}`}>
                    {row.encargoCount}
                  </Link>
                ),
              },
              {
                field: "totalCostUsd",
                header: t("office.companyDashboard.colCost"),
                body: (row: ObjectiveSummaryRow) => formatUsd(row.totalCostUsd),
              },
              {
                field: "currentValue",
                header: t("office.companyDashboard.colProgress"),
                body: (row: ObjectiveSummaryRow) =>
                  row.targetValue != null ? `${row.currentValue ?? 0} / ${row.targetValue}` : "—",
              },
            ]}
            data={objectives}
            emptyMessage={t("office.companyDashboard.noObjectives")}
            paginator={objectives.length > 6}
            rows={6}
          />
        </Panel>
      )}

      <Panel
        title={t("office.companyDashboard.deptHealthTitle")}
        subtitle={t("office.companyDashboard.deptHealthSubtitle")}
      >
        <DataTable
          columns={departmentColumns}
          data={departmentMetrics}
          globalFilterEnabled
          globalFilterPlaceholder={t("office.companyDashboard.filterDept")}
          emptyMessage={t("office.companyDashboard.noDeptActivity")}
          paginator={departmentMetrics.length > 8}
          rows={8}
        />
      </Panel>

      <OfficeCostsPanel />

      <Panel title={t("office.companyDashboard.activityTitle")} subtitle={t("office.companyDashboard.activitySubtitle")} bodySize="sm">
        {activity.length === 0 ? (
          <p className="text-sm text-[var(--foreground-muted)]">{t("office.companyDashboard.noActivity")}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {activity.slice(0, 12).map((item) => (
              <li key={item.id} className="flex gap-3 py-3 text-sm">
                <Activity className="mt-0.5 h-4 w-4 shrink-0 text-[var(--foreground-muted)]" aria-hidden />
                <div className="min-w-0 flex-1">
                  {item.href ? (
                    <Link to={item.href} className="font-medium text-[var(--primary)] hover:underline">
                      {item.title}
                    </Link>
                  ) : (
                    <p className="font-medium text-[var(--foreground)]">{item.title}</p>
                  )}
                  {item.subtitle && <p className="text-[var(--foreground-muted)]">{item.subtitle}</p>}
                  <time className="text-xs text-[var(--foreground-muted)]">{item.timestamp}</time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
