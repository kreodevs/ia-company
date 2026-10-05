import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { getObjectiveDetail, type CompanyGoalDetail } from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import PageFrame from "../components/ui/PageFrame";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import PageLoading from "../components/ui/PageLoading";
import EmptyState from "../components/ui/EmptyState";
import KpiCard from "../components/ui/KpiCard";
import Panel from "../components/ui/Panel";
import StatusPill from "../components/ui/StatusPill";
import { DataTable, type DataTableColumn } from "../components/organisms/DataTable";
import { Button } from "@/components/atoms/Button";

function formatUsd(value: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

export default function OfficeObjectiveDetailPage() {
  const { t } = useTranslation();
  const { goalId } = useParams<{ goalId: string }>();
  const [detail, setDetail] = useState<CompanyGoalDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!goalId) return;
    setLoading(true);
    getObjectiveDetail(goalId)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [goalId]);

  const encargoColumns: DataTableColumn[] = useMemo(
    () => [
      {
        field: "title",
        header: t("office.pages.objectiveDetail.colJob"),
        body: (row: CompanyGoalDetail["recentEncargos"][number]) => (
          <Link className="font-medium text-[var(--primary)] hover:underline" to={`/office/encargos/${row.id}`}>
            {row.title}
          </Link>
        ),
      },
      {
        field: "phase",
        header: t("office.pages.objectiveDetail.colPhase"),
        body: (row: CompanyGoalDetail["recentEncargos"][number]) => (
          <StatusPill status={row.phase === "delivered" ? "completed" : row.phase === "in_progress" ? "running" : "pending"}>
            {row.phase}
          </StatusPill>
        ),
      },
      {
        field: "initiativeName",
        header: t("office.pages.objectiveDetail.colInitiative"),
        body: (row: CompanyGoalDetail["recentEncargos"][number]) => row.initiativeName ?? "—",
      },
      {
        field: "totalCostUsd",
        header: t("office.companyDashboard.colCost"),
        body: (row: CompanyGoalDetail["recentEncargos"][number]) => formatUsd(row.totalCostUsd),
      },
    ],
    [t],
  );

  const initiativeColumns: DataTableColumn[] = useMemo(
    () => [
      { field: "name", header: t("office.pages.objectiveDetail.colInitiative"), sortable: true },
      {
        field: "encargoCount",
        header: t("office.pages.objectiveDetail.encargos"),
        body: (row: CompanyGoalDetail["initiativeRollups"][number]) =>
          row.id === "__unlinked__" ? (
            <span>{row.encargoCount}</span>
          ) : (
            <Link
              className="text-[var(--primary)] hover:underline"
              to={`/office/trabajo?tab=todos&companyGoalId=${goalId}&initiativeId=${row.id}`}
            >
              {row.encargoCount}
            </Link>
          ),
      },
      { field: "deliveredCount", header: t("office.pages.objectiveDetail.delivered"), sortable: true },
      {
        field: "totalCostUsd",
        header: t("office.companyDashboard.colCost"),
        body: (row: CompanyGoalDetail["initiativeRollups"][number]) => formatUsd(row.totalCostUsd),
      },
    ],
    [goalId, t],
  );

  if (loading) return <PageLoading message={t("office.pages.objectiveDetail.loading")} />;
  if (error || !detail) {
    return (
      <PageFrame width="office">
        <EmptyState title={t("office.pages.objectiveDetail.notFound")} description={error ?? undefined} />
      </PageFrame>
    );
  }

  const { goal, stats } = detail;

  return (
    <PageFrame width="office">
      <PageHeader
        variant="command"
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("office.title"), to: "/office" },
              { label: t("nav.objectives"), to: "/office/objetivos" },
              { label: goal.name },
            ]}
          />
        }
        title={goal.name}
        subtitle={goal.description ?? undefined}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={`/office/trabajo?tab=todos&companyGoalId=${goal.id}`}>{t("office.pages.objectiveDetail.viewAllEncargos")}</Link>
          </Button>
        }
      />

      <section className="hero-strip">
        <KpiCard
          label={t("office.pages.objectiveDetail.progress")}
          value={`${stats.progressPercent}%`}
          delta={t("office.pages.objectiveDetail.target", { value: goal.targetValue ?? "—" })}
        />
        <KpiCard label={t("office.pages.objectiveDetail.encargos")} value={stats.encargoCount} delta={`${stats.activeEncargos}`} />
        <KpiCard
          label={t("office.pages.objectiveDetail.delivered")}
          value={stats.deliveredEncargos}
          trend={stats.deliveredEncargos > 0 ? "up" : "flat"}
        />
        <KpiCard label={t("office.companyDashboard.colCost")} value={formatUsd(stats.totalCostUsd)} />
        <KpiCard label={t("office.pages.objectiveDetail.colInitiative")} value={detail.initiatives.length} />
      </section>

      <Panel title={t("office.pages.objectiveDetail.panelInitiatives")} subtitle={t("office.pages.objectiveDetail.panelInitiativesSubtitle")}>
        <DataTable
          columns={initiativeColumns}
          data={detail.initiativeRollups}
          emptyMessage={t("office.companyDashboard.noObjectives")}
        />
      </Panel>

      <Panel title={t("office.pages.objectiveDetail.panelEncargos")} subtitle={t("office.pages.objectiveDetail.panelEncargosSubtitle")}>
        <DataTable
          columns={encargoColumns}
          data={detail.recentEncargos}
          emptyMessage={t("office.recentArchive.empty")}
          paginator={detail.recentEncargos.length > 10}
          rows={10}
        />
      </Panel>
    </PageFrame>
  );
}
