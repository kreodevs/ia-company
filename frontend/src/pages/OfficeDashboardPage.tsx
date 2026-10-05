import PageHeader from "../components/ui/PageHeader";
import PageFrame from "../components/ui/PageFrame";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { Dashboard } from "../components/office/Dashboard";

export const OfficeDashboardPage: React.FC = () => (
  <PageFrame width="office">
    <PageHeader
      variant="command"
      eyebrow={
        <Breadcrumbs
          items={[
            { label: "Oficina", to: "/office" },
            { label: "Dashboard empresarial" },
          ]}
        />
      }
      title="Dashboard empresarial"
      subtitle="Métricas de gestión, salud departamental y actividad reciente (Fase H)."
    />
    <Dashboard />
  </PageFrame>
);
