import { useEffect, useMemo, useState } from "react";
import { getInitiatives, getObjectives, type Initiative, type CompanyGoal } from "../../lib/api";
import PageLoading from "../ui/PageLoading";
import EmptyState from "../ui/EmptyState";
import StatusPill from "../ui/StatusPill";
import { DataTable, type DataTableColumn } from "../organisms/DataTable";

/**
 * Fase F — iniciativas vinculadas a objetivos (Kreo DataTable).
 */
export const Initiatives: React.FC = () => {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [goals, setGoals] = useState<CompanyGoal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getInitiatives(), getObjectives()])
      .then(([inits, objs]) => {
        setInitiatives(inits);
        setGoals(objs);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error loading initiatives"))
      .finally(() => setLoading(false));
  }, []);

  const goalName = useMemo(() => {
    const map = new Map(goals.map((g) => [g.id, g.name]));
    return (id: string) => map.get(id) ?? id;
  }, [goals]);

  const columns: DataTableColumn[] = useMemo(
    () => [
      { field: "name", header: "Iniciativa", sortable: true },
      {
        field: "companyGoalId",
        header: "Objetivo",
        body: (row: Initiative) => goalName(row.companyGoalId),
      },
      {
        field: "status",
        header: "Estado",
        body: (row: Initiative) => {
          const s = (row.status ?? "planned").toLowerCase();
          const pill =
            s === "done" || s === "completed"
              ? "completed"
              : s === "active" || s === "in_progress"
                ? "running"
                : "pending";
          return <StatusPill status={pill}>{row.status ?? "planned"}</StatusPill>;
        },
      },
      {
        field: "description",
        header: "Descripción",
        body: (row: Initiative) => row.description ?? "—",
      },
    ],
    [goalName],
  );

  if (loading) return <PageLoading message="Cargando iniciativas…" />;
  if (error) {
    return <EmptyState title="Error" description={error} />;
  }

  return (
    <DataTable
      columns={columns}
      data={initiatives}
      globalFilterEnabled
      globalFilterPlaceholder="Buscar iniciativa…"
      emptyMessage="No hay iniciativas. Crea una vinculada a un objetivo."
      paginator={initiatives.length > 10}
      rows={10}
    />
  );
};
