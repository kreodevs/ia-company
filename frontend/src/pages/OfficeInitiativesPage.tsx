import { useCallback, useState } from "react";
import { Initiatives } from "../components/office/Initiatives";
import { InitiativeForm } from "../components/office/InitiativeForm";
import PageHeader from "../components/ui/PageHeader";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Panel from "../components/ui/Panel";

export const OfficeInitiativesPage: React.FC = () => {
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
              { label: "Iniciativas" },
            ]}
          />
        }
        title="Iniciativas empresariales"
        subtitle="Proyectos tácticos bajo cada objetivo (Fase F)."
      />
      <InitiativeForm onSuccess={handleSuccess} />
      <Panel title="Iniciativas" subtitle="Estado y objetivo padre">
        <Initiatives key={refreshKey} />
      </Panel>
    </div>
  );
};
