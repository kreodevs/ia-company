import PageHeader from "../components/ui/PageHeader";
import PageFrame from "../components/ui/PageFrame";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { OrganigramMap } from "../components/office/OrganigramMap";

export const OfficeOrganigramPage: React.FC = () => (
  <PageFrame width="office">
    <PageHeader
      variant="command"
      eyebrow={
        <Breadcrumbs
          items={[
            { label: "Oficina", to: "/office" },
            { label: "Organigrama" },
          ]}
        />
      }
      title="Organigrama de la empresa"
      subtitle="Jerarquía de departamentos, responsables y acceso a salas (Fase E)."
    />
    <OrganigramMap />
  </PageFrame>
);
