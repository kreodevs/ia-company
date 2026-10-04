import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { patchEncargoStrategicLink, type OfficeEncargoDetail } from "../../lib/api";
import { StrategicContextFields, type StrategicContextValue } from "./StrategicContextFields";

interface EncargoStrategicLinkEditorProps {
  runId: string;
  detail: Pick<
    OfficeEncargoDetail,
    "companyGoalId" | "initiativeId" | "companyGoalName" | "initiativeName"
  >;
  onUpdated: () => void;
}

/** Fase F — editar vínculo objetivo/iniciativa tras crear el encargo. */
export function EncargoStrategicLinkEditor({ runId, detail, onUpdated }: EncargoStrategicLinkEditorProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<StrategicContextValue>({
    companyGoalId: detail.companyGoalId ?? null,
    initiativeId: detail.initiativeId ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await patchEncargoStrategicLink(runId, value);
      setOpen(false);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Editar contexto estratégico
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <StrategicContextFields value={value} onChange={setValue} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
          Guardar vínculo
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
