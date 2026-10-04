import { useEffect, useMemo, useState } from "react";
import { getObjectives, type CompanyGoal } from "../../lib/api";
import PageLoading from "../ui/PageLoading";
import EmptyState from "../ui/EmptyState";
import StatusPill from "../ui/StatusPill";
import { DataTable, type DataTableColumn } from "../organisms/DataTable";

function progressPercent(goal: CompanyGoal): number {
  if (goal.targetValue == null || goal.targetValue === 0) return 0;
  const current = goal.currentValue ?? 0;
  return Math.min(100, Math.round((current / goal.targetValue) * 100));
}

/**
 * Fase F — listado de objetivos con Kreo DataTable.
 */
export const Objectives: React.FC = () => {
  const [objectives, setObjectives] = useState<CompanyGoal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getObjectives()
      .then(setObjectives)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error loading objectives"))
      .finally(() => setLoading(false));
  }, []);

  const columns: DataTableColumn[] = useMemo(
    () => [
      { field: "name", header: "Objetivo", sortable: true },
      {
        field: "description",
        header: "Descripción",
        body: (row: CompanyGoal) => row.description ?? "—",
      },
      {
        field: "targetValue",
        header: "Meta",
        sortable: true,
        body: (row: CompanyGoal) => (row.targetValue != null ? `${row.targetValue}%` : "—"),
      },
      {
        field: "currentValue",
        header: "Actual",
        sortable: true,
        body: (row: CompanyGoal) => (row.currentValue != null ? `${row.currentValue}%` : "—"),
      },
      {
        field: "progress",
        header: "Progreso",
        body: (row: CompanyGoal) => {
          const pct = progressPercent(row);
          const status = pct >= 100 ? "completed" : pct >= 50 ? "running" : "pending";
          return <StatusPill status={status}>{`${pct}%`}</StatusPill>;
        },
      },
    ],
    [],
  );

  if (loading) return <PageLoading message="Cargando objetivos…" />;
  if (error) {
    return <EmptyState title="Error" description={error} />;
  }

  return (
    <DataTable
      columns={columns}
      data={objectives}
      globalFilterEnabled
      globalFilterPlaceholder="Buscar objetivo…"
      emptyMessage="Aún no hay objetivos. Crea el primero con el formulario superior."
      paginator={objectives.length > 10}
      rows={10}
    />
  );
};
