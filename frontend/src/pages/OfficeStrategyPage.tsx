import PageHeader from "../components/ui/PageHeader";
import PageFrame from "../components/ui/PageFrame";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { Objectives } from "../components/office/Objectives";
import { Initiatives } from "../components/office/Initiatives";
import { Dashboard } from "../components/office/Dashboard";
import Panel from "../components/ui/Panel";

/**
 * Vista agregada de estrategia (objetivos, iniciativas, pulso de coste).
 */
export const OfficeStrategyPage: React.FC = () => (
  <PageFrame width="office">
    <PageHeader
      variant="command"
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
  </PageFrame>
);
