import { useEffect, useMemo, useState } from "react";
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
        header: "Encargo",
        body: (row: CompanyGoalDetail["recentEncargos"][number]) => (
          <Link className="font-medium text-[var(--primary)] hover:underline" to={`/office/encargos/${row.id}`}>
            {row.title}
          </Link>
        ),
      },
      {
        field: "phase",
        header: "Fase",
        body: (row: CompanyGoalDetail["recentEncargos"][number]) => (
          <StatusPill status={row.phase === "delivered" ? "completed" : row.phase === "in_progress" ? "running" : "pending"}>
            {row.phase}
          </StatusPill>
        ),
      },
      {
        field: "initiativeName",
        header: "Iniciativa",
        body: (row: CompanyGoalDetail["recentEncargos"][number]) => row.initiativeName ?? "—",
      },
      {
        field: "totalCostUsd",
        header: "Coste",
        body: (row: CompanyGoalDetail["recentEncargos"][number]) => formatUsd(row.totalCostUsd),
      },
    ],
    [],
  );

  const initiativeColumns: DataTableColumn[] = useMemo(
    () => [
      { field: "name", header: "Iniciativa", sortable: true },
      {
        field: "encargoCount",
        header: "Encargos",
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
      { field: "deliveredCount", header: "Entregados", sortable: true },
      {
        field: "totalCostUsd",
        header: "Coste",
        body: (row: CompanyGoalDetail["initiativeRollups"][number]) => formatUsd(row.totalCostUsd),
      },
    ],
    [goalId],
  );

  if (loading) return <PageLoading message="Cargando objetivo…" />;
  if (error || !detail) {
    return (
      <PageFrame width="office">
        <EmptyState title="Objetivo no encontrado" description={error ?? undefined} />
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
              { label: "Oficina", to: "/office" },
              { label: "Objetivos", to: "/office/objetivos" },
              { label: goal.name },
            ]}
          />
        }
        title={goal.name}
        subtitle={goal.description ?? undefined}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={`/office/trabajo?tab=todos&companyGoalId=${goal.id}`}>Ver todos los encargos</Link>
          </Button>
        }
      />

      <section className="hero-strip">
        <KpiCard label="Progreso" value={`${stats.progressPercent}%`} delta={`Meta: ${goal.targetValue ?? "—"}%`} />
        <KpiCard label="Encargos" value={stats.encargoCount} delta={`${stats.activeEncargos} activos`} />
        <KpiCard label="Entregados" value={stats.deliveredEncargos} trend={stats.deliveredEncargos > 0 ? "up" : "flat"} />
        <KpiCard label="Coste total" value={formatUsd(stats.totalCostUsd)} />
        <KpiCard label="Iniciativas" value={detail.initiatives.length} />
      </section>

      <Panel title="Iniciativas" subtitle="Encargos y coste por iniciativa">
        <DataTable
          columns={initiativeColumns}
          data={detail.initiativeRollups}
          emptyMessage="Aún no hay encargos vinculados a iniciativas."
        />
      </Panel>

      <Panel title="Encargos recientes" subtitle="Vinculados a este objetivo">
        <DataTable
          columns={encargoColumns}
          data={detail.recentEncargos}
          emptyMessage="Crea un encargo desde la recepción y asígnalo a este objetivo."
          paginator={detail.recentEncargos.length > 10}
          rows={10}
        />
      </Panel>
    </PageFrame>
  );
}
