import { useEffect, useState } from "react";
import { getDepartmentOperations, type DepartmentOperationRow } from "../../lib/api";
import Panel from "../ui/Panel";
import EmptyState from "../ui/EmptyState";
import PageLoading from "../ui/PageLoading";
import { RoutineCard } from "./RoutineCard";

interface DepartmentOperationsPanelProps {
  departmentSlug?: string;
  orgUnitId?: string;
}

/** Fase I — operaciones recurrentes como negocio (Kreo Card). */
export function DepartmentOperationsPanel({ departmentSlug, orgUnitId }: DepartmentOperationsPanelProps) {
  const [items, setItems] = useState<DepartmentOperationRow[]>([]);
  const reload = () => {
    setLoading(true);
    getDepartmentOperations({ departmentSlug, orgUnitId })
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when scope changes
  }, [departmentSlug, orgUnitId]);

  if (loading) return <PageLoading message="Cargando operaciones…" />;
  if (error) return <EmptyState title="Operaciones" description={error} />;

  return (
    <Panel title="Operaciones recurrentes" subtitle="Rutinas programadas del departamento (Fase I)">
      {items.length === 0 ? (
        <p className="text-sm text-[var(--foreground-muted)]">
          No hay rutinas vinculadas. Configúralas en Ajustes → Orquestación o procedimientos programados.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((op) => (
            <RoutineCard key={op.scheduleId} operation={op} onChanged={reload} />
          ))}
        </div>
      )}
    </Panel>
  );
}
