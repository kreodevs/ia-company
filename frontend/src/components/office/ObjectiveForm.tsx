import { useMemo, useState } from "react";
import { createObjective, updateObjective, deleteObjective, type CompanyGoal } from "../../lib/api";
import { DynamicForm } from "../organisms/DynamicForm";
import { Button } from "@/components/atoms/Button";
import Panel from "../ui/Panel";

/**
 * Formulario Kreo DynamicForm para objetivos (Fase F).
 */
export const ObjectiveForm: React.FC<{ initial?: CompanyGoal; onSuccess?: () => void }> = ({
  initial,
  onSuccess,
}) => {
  const isEdit = !!initial?.id;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sections = useMemo(
    () => [
      {
        id: "objective",
        title: isEdit ? "Editar objetivo" : "Nuevo objetivo",
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
            name: "targetValue",
            type: "number" as const,
            label: "Meta (%)",
            colSpan: 6 as const,
            defaultValue: initial?.targetValue ?? undefined,
          },
        ],
      },
    ],
    [initial, isEdit],
  );

  const handleSubmit = async (data: Record<string, unknown>) => {
    setError(null);
    setSubmitting(true);
    const payload = {
      name: String(data.name ?? ""),
      description: data.description ? String(data.description) : null,
      targetValue: data.targetValue != null && data.targetValue !== "" ? Number(data.targetValue) : null,
    };
    try {
      if (isEdit && initial?.id) {
        await updateObjective(initial.id, payload);
      } else {
        await createObjective(payload);
      }
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving objective");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !initial?.id) return;
    if (!window.confirm("¿Eliminar este objetivo?")) return;
    setSubmitting(true);
    try {
      await deleteObjective(initial.id);
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error deleting objective");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Panel title={isEdit ? "Editar objetivo" : "Crear objetivo"} bodySize="sm">
      {error && <p className="mb-3 text-sm text-[var(--destructive)]">{error}</p>}
      <div className="kreo-org">
        <DynamicForm
          sections={sections}
          variant="premium"
          submitText={isEdit ? "Actualizar" : "Crear objetivo"}
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
