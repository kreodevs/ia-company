import PageHeader from "../components/ui/PageHeader";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { OrganigramMap } from "../components/office/OrganigramMap";

export const OfficeOrganigramPage: React.FC = () => (
  <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-0">
    <PageHeader
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
  </div>
);
