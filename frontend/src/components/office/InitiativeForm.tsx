import { useEffect, useMemo, useState } from "react";
import {
  createInitiative,
  updateInitiative,
  deleteInitiative,
  getObjectives,
  type Initiative,
  type CompanyGoal,
} from "../../lib/api";
import { DynamicForm } from "../organisms/DynamicForm";
import { Button } from "@/components/atoms/Button";
import Panel from "../ui/Panel";
import PageLoading from "../ui/PageLoading";

const STATUS_OPTIONS = [
  { label: "Planificada", value: "planned" },
  { label: "En curso", value: "in_progress" },
  { label: "Completada", value: "completed" },
  { label: "En pausa", value: "paused" },
];

/**
 * Formulario Kreo DynamicForm para iniciativas (Fase F).
 */
export const InitiativeForm: React.FC<{ initial?: Initiative; onSuccess?: () => void }> = ({
  initial,
  onSuccess,
}) => {
  const isEdit = !!initial?.id;
  const [goals, setGoals] = useState<CompanyGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getObjectives()
      .then(setGoals)
      .catch(() => setGoals([]))
      .finally(() => setGoalsLoading(false));
  }, []);

  const goalOptions = useMemo(
    () => goals.map((g) => ({ label: g.name, value: g.id })),
    [goals],
  );

  const sections = useMemo(
    () => [
      {
        id: "initiative",
        title: isEdit ? "Editar iniciativa" : "Nueva iniciativa",
        fields: [
          {
            name: "name",
            type: "text" as const,
            label: "Nombre",
            required: true,
            colSpan: 12 as const,
            defaultValue: initial?.name ?? "",
          },
          {
            name: "description",
            type: "textarea" as const,
            label: "Descripción",
            colSpan: 12 as const,
            defaultValue: initial?.description ?? "",
          },
          {
            name: "companyGoalId",
            type: "select" as const,
            label: "Objetivo",
            required: true,
            colSpan: 6 as const,
            options: goalOptions,
            defaultValue: initial?.companyGoalId ?? "",
          },
          {
            name: "status",
            type: "select" as const,
            label: "Estado",
            colSpan: 6 as const,
            options: STATUS_OPTIONS,
            defaultValue: initial?.status ?? "planned",
          },
        ],
      },
    ],
    [initial, isEdit, goalOptions],
  );

  const handleSubmit = async (data: Record<string, unknown>) => {
    setError(null);
    setSubmitting(true);
    const payload = {
      name: String(data.name ?? ""),
      description: data.description ? String(data.description) : null,
      status: String(data.status ?? "planned"),
      companyGoalId: String(data.companyGoalId ?? ""),
    };
    try {
      if (isEdit && initial?.id) {
        await updateInitiative(initial.id, payload);
      } else {
        await createInitiative(payload);
      }
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving initiative");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !initial?.id) return;
    if (!window.confirm("¿Eliminar esta iniciativa?")) return;
    setSubmitting(true);
    try {
      await deleteInitiative(initial.id);
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error deleting initiative");
    } finally {
      setSubmitting(false);
    }
  };

  if (goalsLoading) return <PageLoading message="Cargando objetivos…" />;

  return (
    <Panel title={isEdit ? "Editar iniciativa" : "Crear iniciativa"} bodySize="sm">
      {goals.length === 0 && (
        <p className="mb-3 text-sm text-[var(--foreground-muted)]">
          Crea al menos un objetivo antes de registrar una iniciativa.
        </p>
      )}
      {error && <p className="mb-3 text-sm text-[var(--destructive)]">{error}</p>}
      <div className="kreo-org">
        <DynamicForm
          sections={sections}
          variant="premium"
          submitText={isEdit ? "Actualizar" : "Crear iniciativa"}
          submitting={submitting}
          onSubmit={(data) => void handleSubmit(data as Record<string, unknown>)}
        />
      </div>
      {isEdit && (
        <Button type="button" variant="destructive" size="sm" className="mt-4" onClick={() => void handleDelete()}>
          Eliminar
        </Button>
      )}
    </Panel>
  );
};
