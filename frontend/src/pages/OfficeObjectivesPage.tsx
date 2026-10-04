import { useCallback, useState } from "react";
import { Objectives } from "../components/office/Objectives";
import { ObjectiveForm } from "../components/office/ObjectiveForm";
import PageHeader from "../components/ui/PageHeader";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Panel from "../components/ui/Panel";

export const OfficeObjectivesPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-0">
      <PageHeader
        eyebrow={
          <Breadcrumbs
            items={[
              { label: "Oficina", to: "/office" },
              { label: "Objetivos" },
            ]}
          />
        }
        title="Objetivos empresariales"
        subtitle="Resultados que la empresa persigue; vinculan iniciativas y encargos (Fase F)."
      />
      <ObjectiveForm onSuccess={handleSuccess} />
      <Panel title="Objetivos activos" subtitle="Progreso frente a la meta definida">
        <Objectives key={refreshKey} />
      </Panel>
    </div>
  );
};
