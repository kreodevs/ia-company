import PageHeader from "../components/ui/PageHeader";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { Objectives } from "../components/office/Objectives";
import { Initiatives } from "../components/office/Initiatives";
import { Dashboard } from "../components/office/Dashboard";
import Panel from "../components/ui/Panel";

/**
 * Vista agregada de estrategia (objetivos, iniciativas, pulso de coste).
 */
export const OfficeStrategyPage: React.FC = () => (
  <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-0">
    <PageHeader
      eyebrow={
        <Breadcrumbs
          items={[
            { label: "Oficina", to: "/office" },
            { label: "Estrategia" },
          ]}
        />
      }
      title="Estrategia empresarial"
      subtitle="Objetivos, iniciativas y métricas consolidadas."
    />
    <Panel title="Objetivos" bodySize="sm">
      <Objectives />
    </Panel>
    <Panel title="Iniciativas" bodySize="sm">
      <Initiatives />
    </Panel>
    <Dashboard />
  </div>
);
