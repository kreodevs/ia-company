import PageHeader from "../components/ui/PageHeader";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { Dashboard } from "../components/office/Dashboard";

export const OfficeDashboardPage: React.FC = () => (
  <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-0">
    <PageHeader
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
  </div>
);
